// Features for advanced task management UI
// Assumes modern.css and assistant.js are loaded

// --- DOM Elements ---
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const deadlineInput = document.getElementById('deadline-input');
const taskList = document.getElementById('task-list');
const analyticsBox = document.getElementById('analytics-box');
const searchInput = document.getElementById('search-input');

// --- Add/Edit Task ---
taskForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const task = taskInput.value.trim();
    const deadline = deadlineInput.value;
    if (!task) return;
    const response = await fetch('/api/add_task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, deadline })
    });
    const data = await response.json();
    addTaskToList(data);
    taskInput.value = '';
    deadlineInput.value = '';
    updateAnalytics();
});

// --- Render Task List ---
function addTaskToList(taskObj) {
    const li = document.createElement('li');
    li.className = taskObj.completed ? 'completed' : '';
    li.innerHTML = `<span><b>Task:</b> ${taskObj.task} <small>(${taskObj.category}, Priority: ${taskObj.priority}${taskObj.deadline ? ', Due: ' + taskObj.deadline : ''})</small></span>`;
    // Complete/undo button
    const completeBtn = document.createElement('button');
    completeBtn.textContent = taskObj.completed ? 'Undo' : 'Done';
    completeBtn.className = 'complete-btn';
    completeBtn.onclick = async function() {
        await fetch(`/api/complete_task/${taskObj.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed: taskObj.completed ? 0 : 1 })
        });
        loadTasks();
        updateAnalytics();
    };
    li.appendChild(completeBtn);
    // Edit button
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.className = 'edit-btn';
    editBtn.onclick = function() {
        taskInput.value = taskObj.task;
        deadlineInput.value = taskObj.deadline || '';
        taskForm.onsubmit = async function(e) {
            e.preventDefault();
            await fetch(`/api/update_task/${taskObj.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task: taskInput.value, deadline: deadlineInput.value })
            });
            taskInput.value = '';
            deadlineInput.value = '';
            taskForm.onsubmit = null;
            loadTasks();
        };
    };
    li.appendChild(editBtn);
    // Delete button
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.className = 'delete-btn';
    delBtn.onclick = async function() {
        await fetch(`/api/delete_task/${taskObj.id}`, { method: 'DELETE' });
        li.remove();
        updateAnalytics();
    };
    li.appendChild(delBtn);
    taskList.appendChild(li);
}

// --- Load Tasks ---
async function loadTasks(query = '') {
    let url = '/api/tasks';
    if (query) url += `?search=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    const tasks = await response.json();
    taskList.innerHTML = '';
    tasks.forEach(addTaskToList);
}

// --- Search/Filter ---
searchInput.addEventListener('input', function() {
    loadTasks(searchInput.value);
});

// --- Analytics ---
async function updateAnalytics() {
    const response = await fetch('/api/analytics');
    const data = await response.json();
    analyticsBox.innerHTML = `<b>Total:</b> ${data.total} | <b>Completed:</b> ${data.completed} | <b>Pending:</b> ${data.pending}`;
}

// --- Initial Load ---
loadTasks();
updateAnalytics();
