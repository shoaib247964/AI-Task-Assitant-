from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3

import os
import openai
from dotenv import load_dotenv

import os
app = Flask(__name__, static_folder='../frontend', static_url_path='')

CORS(app)


# Initialize SQLite DB
conn = sqlite3.connect('tasks.db', check_same_thread=False)
c = conn.cursor()
# Category table
c.execute('''CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE
)''')
# Task table
c.execute('''CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY,
    task TEXT,
    category TEXT,
    priority TEXT,
    deadline TEXT,
    repeat TEXT DEFAULT 'none',
    completed INTEGER DEFAULT 0
)''')
# Migration: add columns if missing
try:
    c.execute('ALTER TABLE tasks ADD COLUMN deadline TEXT')
    conn.commit()
except sqlite3.OperationalError:
    pass
try:
    c.execute('ALTER TABLE tasks ADD COLUMN completed INTEGER DEFAULT 0')
    conn.commit()
except sqlite3.OperationalError:
    pass
try:
    c.execute("ALTER TABLE tasks ADD COLUMN repeat TEXT DEFAULT 'none'")
    conn.commit()
except sqlite3.OperationalError:
    pass
# Migration: add deadline and completed columns if missing
try:
    c.execute('ALTER TABLE tasks ADD COLUMN deadline TEXT')
    conn.commit()
except sqlite3.OperationalError:
    pass
try:
    c.execute('ALTER TABLE tasks ADD COLUMN completed INTEGER DEFAULT 0')
    conn.commit()
except sqlite3.OperationalError:
    pass




# Load environment variables from .env file
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

CATEGORIES = ['Work', 'Personal', 'Shopping', 'Health', 'Finance', 'Other']

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

# Add task API (returns task id)
@app.route('/api/add_task', methods=['POST'])
def add_task():
    data = request.get_json()
    task = data.get('task', '')
    # AI categorization using OpenAI
    category = 'Other'
    try:
        prompt = f"""
You are an intelligent assistant that classifies tasks into one of these categories: {', '.join(CATEGORIES)}.
Task: {task}
Category (choose one):
"""
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "system", "content": "You are a helpful assistant."},
                     {"role": "user", "content": prompt}]
        )
        category_resp = response.choices[0].message.content.strip()
        if category_resp in CATEGORIES:
            category = category_resp
    except Exception as e:
        print("[ERROR] OpenAI API failed:", e)
        category = 'Other'
    # Simple priority extraction (demo: urgent/normal/low)
    if 'urgent' in task.lower() or 'asap' in task.lower():
        priority = 'High'
    elif 'soon' in task.lower() or 'today' in task.lower():
        priority = 'Medium'
    else:
        priority = 'Low'
    deadline = data.get('deadline', '')
    # Store in DB
    repeat = data.get('repeat', 'none')
    c.execute('INSERT INTO tasks (task, category, priority, deadline, repeat, completed) VALUES (?, ?, ?, ?, ?, 0)', (task, category, priority, deadline, repeat))
    conn.commit()
    task_id = c.lastrowid
    return jsonify({'task': task, 'category': category, 'priority': priority, 'deadline': deadline, 'repeat': repeat, 'completed': 0, 'id': task_id})

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    c.execute('SELECT id, task, category, priority, deadline, repeat, completed FROM tasks ORDER BY id DESC')
    rows = c.fetchall()
    tasks = [{'id': row[0], 'task': row[1], 'category': row[2], 'priority': row[3], 'deadline': row[4], 'repeat': row[5], 'completed': row[6]} for row in rows]
    return jsonify(tasks)
# Category management endpoints
@app.route('/api/categories', methods=['GET'])
def get_categories():
    c.execute('SELECT name FROM categories ORDER BY name ASC')
    return jsonify([row[0] for row in c.fetchall()])

@app.route('/api/add_category', methods=['POST'])
def add_category():
    data = request.get_json()
    name = data.get('name', '').strip()
    if name:
        try:
            c.execute('INSERT INTO categories (name) VALUES (?)', (name,))
            conn.commit()
        except sqlite3.IntegrityError:
            pass
    return jsonify({'success': True})

@app.route('/api/delete_category', methods=['POST'])
def delete_category():
    data = request.get_json()
    name = data.get('name', '').strip()
    if name:
        c.execute('DELETE FROM categories WHERE name=?', (name,))
        conn.commit()
    return jsonify({'success': True})
# Mark task as complete/incomplete
@app.route('/api/complete_task/<int:task_id>', methods=['POST'])
def complete_task(task_id):
    data = request.get_json()
    completed = int(data.get('completed', 1))
    c.execute('UPDATE tasks SET completed=? WHERE id=?', (completed, task_id))
    conn.commit()
    return jsonify({'success': True})
# Edit/update a task (including deadline)
@app.route('/api/update_task/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.get_json()
    fields = []
    params = []
    for key in ['task', 'category', 'priority', 'deadline', 'repeat']:
        if key in data:
            fields.append(f"{key}=?")
            params.append(data[key])
    if fields:
        params.append(task_id)
        sql = 'UPDATE tasks SET ' + ', '.join(fields) + ' WHERE id=?'
        c.execute(sql, params)
        conn.commit()
    return jsonify({'success': True})

# Delete a task
@app.route('/api/delete_task/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    c.execute('DELETE FROM tasks WHERE id=?', (task_id,))
    conn.commit()
    return jsonify({'success': True})


# Assistant Q&A endpoint with RAG (contextual task retrieval)
@app.route('/api/assistant', methods=['POST'])
def assistant():
    data = request.get_json()
    question = data.get('question', '')
    answer = "Sorry, I couldn't answer that."
    # Retrieve all tasks
    c.execute('SELECT task, category, priority, deadline, repeat, completed FROM tasks')
    all_tasks = c.fetchall()
    # Simple keyword-based retrieval: rank tasks by overlap with question
    def task_score(task_row):
        task_text = ' '.join([str(x) for x in task_row if x is not None]).lower()
        return sum(1 for word in question.lower().split() if word in task_text)
    # Get top 5 relevant tasks
    top_tasks = sorted(all_tasks, key=task_score, reverse=True)[:5]
    # Format context for LLM
    context = "\n".join([
        f"Task: {t[0]} | Category: {t[1]} | Priority: {t[2]} | Deadline: {t[3]} | Repeat: {t[4]} | Completed: {'Yes' if t[5] else 'No'}"
        for t in top_tasks
    ])
    prompt = f"""
You are an intelligent assistant for personal productivity. Here are some of the user's current tasks:\n{context}\n\nUser question: {question}\n\nAnswer the user's question using the above tasks as context. If the answer is not in the tasks, answer generally as a productivity assistant. Be concise and helpful.\n"""
    try:
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "system", "content": "You are a helpful assistant."},
                     {"role": "user", "content": prompt}]
        )
        answer = response.choices[0].message.content.strip()
    except Exception as e:
        print("[ERROR] OpenAI Assistant failed:", e)
    return jsonify({'answer': answer})

# Summarize a task and suggest subtasks/next steps
@app.route('/api/summarize_task', methods=['POST'])
def summarize_task():
    data = request.get_json()
    task = data.get('task', '')
    summary = ""
    suggestions = []
    try:
        prompt = f"""
You are an expert productivity assistant. Given the following task or note, summarize it in one concise sentence and suggest 2-4 actionable subtasks or next steps.\n\nTask: {task}\n\nSummary (1 sentence):\nSubtasks/Next Steps (bulleted):\n"""
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "system", "content": "You are a helpful assistant."},
                     {"role": "user", "content": prompt}]
        )
        content = response.choices[0].message.content.strip()
        # Parse summary and suggestions
        lines = content.split('\n')
        summary = lines[0].replace('Summary (1 sentence):', '').strip()
        suggestions = [l.lstrip('-•* ').strip() for l in lines[1:] if l.strip() and ('-' in l or '•' in l or '*' in l)]
    except Exception as e:
        print("[ERROR] OpenAI Summarize failed:", e)
        summary = "Could not summarize."
    return jsonify({'summary': summary, 'suggestions': suggestions})

# Prioritize all tasks with reasoning
@app.route('/api/prioritize_tasks', methods=['GET'])
def prioritize_tasks():
    c.execute('SELECT id, task, category, priority, deadline, repeat, completed FROM tasks')
    all_tasks = c.fetchall()
    if not all_tasks:
        return jsonify({'prioritized': []})
    # Format tasks for LLM
    task_list = "\n".join([
        f"{t[0]}. {t[1]} (Category: {t[2]}, Priority: {t[3]}, Deadline: {t[4]}, Repeat: {t[5]}, Completed: {'Yes' if t[6] else 'No'})"
        for t in all_tasks
    ])
    prompt = f"""
You are an expert productivity assistant. Here is a list of tasks:\n{task_list}\n\nOrder these tasks by priority (most important first), considering urgency, deadlines, and importance. For each, give a short reason.\n\nFormat:\n1. Task (Reason)\n2. ...\n"""
    prioritized = []
    try:
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "system", "content": "You are a helpful assistant."},
                     {"role": "user", "content": prompt}]
        )
        content = response.choices[0].message.content.strip()
        # Parse LLM output into list
        for line in content.split('\n'):
            if line.strip() and (line[0].isdigit() or line.startswith('-')):
                prioritized.append(line.strip())
    except Exception as e:
        print("[ERROR] OpenAI Prioritize failed:", e)
    return jsonify({'prioritized': prioritized})

if __name__ == '__main__':
    app.run(debug=True)
