document.addEventListener('DOMContentLoaded', function() {
    loadTasks();
    // Add task
    document.getElementById('task-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const input = document.getElementById('task-input');
        const deadlineInput = document.getElementById('deadline-input');
        const task = input.value.trim();
        const deadline = deadlineInput.value;
        const category = document.getElementById('category-select').value;
        const repeat = document.getElementById('repeat-select').value;
        if (!task) return;
        const response = await fetch('/api/add_task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task, deadline, category, repeat })
        });
        const data = await response.json();
        loadTasks();
        input.value = '';
        deadlineInput.value = '';
    });
    // Show All Tasks button
    const showBtn = document.querySelector('.time-data-btn');
    if (showBtn) showBtn.onclick = loadTasks;
});

function addTaskToList(task, category, priority, id, deadline, completed) {
    const li = document.createElement('li');
    li.className = completed ? 'completed-task' : '';
    li.innerHTML = `<span>${task} <small>(${category}, Priority: ${priority}${deadline ? ', Due: ' + deadline : ''})</small></span>`;
    // Complete/incomplete button
    const completeBtn = document.createElement('button');
    completeBtn.textContent = completed ? 'Mark Incomplete' : 'Mark Complete';
    completeBtn.className = completed ? 'complete-btn-inactive' : 'complete-btn';
    completeBtn.style.minWidth = '110px';
    completeBtn.style.marginLeft = '8px';
    completeBtn.onclick = async function() {
        await fetch(`/api/complete_task/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed: completed ? 0 : 1 })
        });
        loadTasks();
    };
    li.appendChild(completeBtn);
    // Edit button
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.className = 'edit-btn';
    editBtn.style.minWidth = '60px';
    editBtn.style.marginLeft = '8px';
    editBtn.onclick = function() {
        showEditModal({ id, task, deadline });
    };
    li.appendChild(editBtn);
    // Delete button
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.className = 'delete-btn';
    delBtn.style.minWidth = '60px';
    delBtn.style.marginLeft = '8px';
    delBtn.onclick = async function() {
        await fetch(`/api/delete_task/${id}`, { method: 'DELETE' });
        loadTasks();
    };
    li.appendChild(delBtn);
    // Summarize button
    const sumBtn = document.createElement('button');
    sumBtn.textContent = 'Summarize';
    sumBtn.className = 'edit-btn';
    sumBtn.style.background = '#38b6ff';
    sumBtn.style.marginLeft = '8px';
    sumBtn.onclick = async function() {
        showSummarizeModal(task);
    };
    li.appendChild(sumBtn);
    document.getElementById('task-list').appendChild(li);
}

async function loadTasks() {
    const response = await fetch('/api/tasks');
    const tasks = await response.json();
    document.getElementById('task-list').innerHTML = '';
    tasks.forEach(t => addTaskToList(t.task, t.category, t.priority, t.id, t.deadline, t.completed || 0));
}

// Edit modal logic
function showEditModal(taskObj) {
    const modalBg = document.getElementById('edit-modal-bg');
    const taskInput = document.getElementById('edit-task-input');
    const deadlineInput = document.getElementById('edit-deadline-input');
    const repeatInput = document.getElementById('edit-repeat-select');
    modalBg.style.display = 'flex';
    taskInput.value = taskObj.task;
    deadlineInput.value = taskObj.deadline || '';
    repeatInput.value = taskObj.repeat || 'none';
    // Save
    document.getElementById('edit-save').onclick = async function() {
        await fetch(`/api/update_task/${taskObj.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task: taskInput.value, deadline: deadlineInput.value, repeat: repeatInput.value })
        });
        modalBg.style.display = 'none';
        loadTasks();
    };
    // Cancel
    document.getElementById('edit-cancel').onclick = function() {
        modalBg.style.display = 'none';
    };
}

// Summarize modal logic
function showSummarizeModal(taskText) {
    let modal = document.getElementById('summarize-modal-bg');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'summarize-modal-bg';
        modal.className = 'modal-bg';
        modal.innerHTML = `<div class="modal"><h2>Task Summary</h2><div id="summarize-content">Loading...</div><div class="modal-actions"><button id="summarize-close">Close</button></div></div>`;
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    document.getElementById('summarize-content').innerHTML = 'Loading...';
    fetch('/api/summarize_task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: taskText })
    })
    .then(res => res.json())
    .then(data => {
        let html = `<b>Summary:</b> ${data.summary || 'N/A'}<br><b>Subtasks/Next Steps:</b><ul>`;
        (data.suggestions || []).forEach(s => { html += `<li>${s}</li>`; });
        html += '</ul>';
        document.getElementById('summarize-content').innerHTML = html;
    });
    document.getElementById('summarize-close').onclick = function() {
        modal.style.display = 'none';
    };
}

// Prioritize tasks feature
window.addEventListener('DOMContentLoaded', function() {
    // Add prioritize button if not present
    if (!document.getElementById('prioritize-btn')) {
        const btn = document.createElement('button');
        btn.id = 'prioritize-btn';
        btn.textContent = 'Prioritize Tasks';
        btn.className = 'edit-btn';
        btn.style.background = '#43e97b';
        btn.style.marginBottom = '12px';
        btn.onclick = async function() {
            btn.disabled = true;
            btn.textContent = 'Loading...';
            const res = await fetch('/api/prioritize_tasks');
            const data = await res.json();
            showPrioritizeModal(data.prioritized || []);
            btn.disabled = false;
            btn.textContent = 'Prioritize Tasks';
        };
        document.querySelector('.container').insertBefore(btn, document.getElementById('task-form'));
    }
});

function showPrioritizeModal(list) {
    let modal = document.getElementById('prioritize-modal-bg');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'prioritize-modal-bg';
        modal.className = 'modal-bg';
        modal.innerHTML = `<div class="modal"><h2>Prioritized Tasks</h2><div id="prioritize-content"></div><div class="modal-actions"><button id="prioritize-close">Close</button></div></div>`;
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    document.getElementById('prioritize-content').innerHTML = list.length ? `<ol>${list.map(x => `<li>${x}</li>`).join('')}</ol>` : 'No tasks to prioritize.';
    document.getElementById('prioritize-close').onclick = function() {
        modal.style.display = 'none';
    };
}
