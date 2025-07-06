// Simple assistant chat UI logic
const assistantForm = document.getElementById('assistant-form');
const assistantInput = document.getElementById('assistant-input');
const assistantChat = document.getElementById('assistant-chat');

assistantForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const question = assistantInput.value.trim();
    if (!question) return;
    addMessage('user', question);
    assistantInput.value = '';
    const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
    });
    const data = await response.json();
    addMessage('assistant', data.answer);
});

function addMessage(role, text) {
    const msg = document.createElement('div');
    msg.className = 'msg ' + role;
    msg.textContent = text;
    assistantChat.appendChild(msg);
    assistantChat.scrollTop = assistantChat.scrollHeight;
}
