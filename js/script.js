/**
 * Aplikasi Todo List
 * Sistem manajemen tugas sederhana dengan operasi CRUD, filtering, dan penyimpanan lokal
 */

let todos = [];
let currentFilter = 'all';
let currentSort = 'created';
let searchTerm = '';
let confirmCallback = null;
let currentParentId = null;
let editData = { type: null, todoId: null, subtaskId: null };

/**
 * Inisialisasi aplikasi ketika DOM sudah siap
 * Mengatur data awal dan merender antarmuka
 */
document.addEventListener('DOMContentLoaded', function() {
    loadTodos();
    updateStats();
    renderTodos();
    initializeApp();
});

/**
 * Mengatur event listener dan nilai default
 * Mengkonfigurasi handler input dan menetapkan tanggal hari ini sebagai default
 */
function initializeApp() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateInput').value = today;
    
    // Event listener untuk todo input
    document.getElementById('todoInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTodo();
        }
    });
    
    // Event listener untuk subtask input
    document.getElementById('subtaskInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addSubtask();
        }
    });
    
    // Event listener untuk edit modal
    document.getElementById('editNameInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            confirmEdit();
        }
    });
    
    // Event listener untuk buttons - remove existing first
    const addBtn = document.getElementById('addBtn');
    const addSubtaskBtn = document.getElementById('addSubtaskBtn');
    const confirmEditBtn = document.getElementById('confirmEditBtn');
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    const filterSelect = document.getElementById('filterSelect');
    const sortSelect = document.getElementById('sortSelect');
    
    // Remove existing event listeners by cloning (for buttons that might have duplicates)
    const newAddSubtaskBtn = addSubtaskBtn.cloneNode(true);
    const newConfirmEditBtn = confirmEditBtn.cloneNode(true);
    addSubtaskBtn.parentNode.replaceChild(newAddSubtaskBtn, addSubtaskBtn);
    confirmEditBtn.parentNode.replaceChild(newConfirmEditBtn, confirmEditBtn);
    
    // Add event listeners
    addBtn.addEventListener('click', addTodo);
    document.getElementById('addSubtaskBtn').addEventListener('click', addSubtask);
    document.getElementById('confirmEditBtn').addEventListener('click', confirmEdit);
    deleteAllBtn.addEventListener('click', deleteAllTodos);
    filterSelect.addEventListener('change', filterTodos);
    sortSelect.addEventListener('change', sortTodos);
    
    // Event listener untuk modal buttons
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('confirmActionBtn').addEventListener('click', confirmAction);
    document.getElementById('closeSubtaskModalBtn').addEventListener('click', closeSubtaskModal);
    document.getElementById('closeEditModalBtn').addEventListener('click', closeEditModal);
    
    // Event listener untuk modal background click
    document.getElementById('confirmModal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
    document.getElementById('subtaskModal').addEventListener('click', function(e) {
        if (e.target === this) closeSubtaskModal();
    });
    document.getElementById('editModal').addEventListener('click', function(e) {
        if (e.target === this) closeEditModal();
    });
    
    // Event listener untuk form validation
    document.getElementById('todoInput').addEventListener('input', validateTodoInput);
    document.getElementById('dateInput').addEventListener('change', validateDateInput);
    document.getElementById('todoInput').addEventListener('focus', clearError);
    document.getElementById('dateInput').addEventListener('focus', clearError);
    document.getElementById('searchInput').addEventListener('input', searchTasks);
}

/**
 * Memuat todos yang tersimpan dari penyimpanan browser
 * Mengambil data dari localStorage dan memastikan semua todos memiliki array subtasks
 */
function loadTodos() {
    const savedTodos = localStorage.getItem('todos');
    if (savedTodos) {
        todos = JSON.parse(savedTodos);
        todos.forEach(todo => {
            if (!todo.subtasks) {
                todo.subtasks = [];
            }
        });
    }
}

/**
 * Menyimpan todos saat ini ke penyimpanan browser
 * Mempertahankan array todos ke localStorage untuk persistensi data
 */
function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

/**
 * Memperbarui statistik tugas dan tampilan progress
 * Menghitung total, selesai, dan tugas tertunda termasuk subtask
 * Memperbarui progress bar dan statistik di UI
 */
function updateStats() {
    const totalTasks = todos.length;
    const totalSubtasks = todos.reduce((sum, todo) => sum + (todo.subtasks?.length || 0), 0);
    const totalItems = totalTasks + totalSubtasks;
    
    const completedTasks = todos.filter(todo => todo.completed).length;
    const completedSubtasks = todos.reduce((sum, todo) => 
        sum + (todo.subtasks?.filter(sub => sub.completed).length || 0), 0);
    const totalCompleted = completedTasks + completedSubtasks;
    
    const pendingItems = totalItems - totalCompleted;
    const progressPercent = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;
    
    document.getElementById('totalTasks').textContent = totalItems;
    document.getElementById('completedTasks').textContent = totalCompleted;
    document.getElementById('pendingTasks').textContent = pendingItems;
    document.getElementById('progressPercent').textContent = progressPercent + '%';
    document.getElementById('progressFill').style.width = progressPercent + '%';
}

/**
 * Validasi field input todo
 * Memeriksa panjang minimum, maksimum, dan nama duplikat
 * @returns {boolean} True jika input valid, false jika tidak
 */
function validateTodoInput() {
    const todoInput = document.getElementById('todoInput');
    const errorElement = document.getElementById('todoInputError');
    const value = todoInput.value.trim();
    
    todoInput.classList.remove('error');
    errorElement.classList.remove('show');
    
    if (value.length === 0) {
        return false;
    }
    
    if (value.length < 3) {
        showError(todoInput, errorElement, 'Task must be at least 3 characters');
        return false;
    }
    
    if (value.length > 100) {
        showError(todoInput, errorElement, 'Task cannot exceed 100 characters');
        return false;
    }
    
    const isDuplicate = todos.some(todo => 
        todo.name.toLowerCase() === value.toLowerCase() && !todo.completed
    );
    
    if (isDuplicate) {
        showError(todoInput, errorElement, 'Task with this name already exists');
        return false;
    }
    
    return true;
}

/**
 * Validasi field input tanggal
 * Memastikan tanggal dipilih dan tidak di masa lalu
 * @returns {boolean} True jika tanggal valid, false jika tidak
 */
function validateDateInput() {
    const dateInput = document.getElementById('dateInput');
    const errorElement = document.getElementById('dateInputError');
    const value = dateInput.value;
    
    dateInput.classList.remove('error');
    errorElement.classList.remove('show');
    
    if (!value) {
        showError(dateInput, errorElement, 'Date must be selected');
        return false;
    }
    
    const selectedDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        showError(dateInput, errorElement, 'Date cannot be in the past');
        return false;
    }
    
    return true;
}

/**
 * Menampilkan pesan error untuk input form
 * @param {HTMLElement} inputElement - Elemen input yang error
 * @param {HTMLElement} errorElement - Elemen pesan error
 * @param {string} message - Pesan error yang ditampilkan
 */
function showError(inputElement, errorElement, message) {
    inputElement.classList.add('error');
    errorElement.textContent = message;
    errorElement.classList.add('show');
}

/**
 * Menghapus status error dari field input
 * @param {Event} event - Event focus dari field input
 */
function clearError(event) {
    const input = event.target;
    const errorElement = input.parentNode.querySelector('.error-message');
    
    input.classList.remove('error');
    if (errorElement) {
        errorElement.classList.remove('show');
    }
}

/**
 * Menambah item todo baru
 * Memvalidasi input, membuat objek todo baru, dan memperbarui tampilan
 */
function addTodo() {
    const todoInput = document.getElementById('todoInput');
    const dateInput = document.getElementById('dateInput');
    const addBtn = document.getElementById('addBtn');
    
    const isTodoValid = validateTodoInput();
    const isDateValid = validateDateInput();
    
    if (!isTodoValid || !isDateValid) {
        if (!isTodoValid) {
            todoInput.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => todoInput.style.animation = '', 500);
        }
        if (!isDateValid) {
            dateInput.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => dateInput.style.animation = '', 500);
        }
        return;
    }
    
    const todoName = todoInput.value.trim();
    const todoDate = dateInput.value;
    
    addBtn.disabled = true;
    addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    
    setTimeout(() => {
        const newTodo = {
            id: Date.now(),
            name: todoName,
            date: todoDate,
            completed: false,
            createdAt: new Date().toISOString(),
            priority: getPriority(todoDate),
            subtasks: []
        };
        
        todos.unshift(newTodo);
        saveTodos();
        
        todoInput.value = '';
        dateInput.value = new Date().toISOString().split('T')[0];
        
        clearAllErrors();
        updateStats();
        renderTodos();
        showSuccessMessage('Task added successfully!');
        
        addBtn.disabled = false;
        addBtn.innerHTML = '<i class="fas fa-plus"></i> ADD';
        todoInput.focus();
    }, 300);
}

/**
 * Menghitung prioritas tugas berdasarkan tanggal jatuh tempo
 * @param {string} date - Tanggal jatuh tempo dalam format YYYY-MM-DD
 * @returns {string} Level prioritas: 'high', 'medium', atau 'low'
 */
function getPriority(date) {
    const todoDate = new Date(date);
    const today = new Date();
    const diffTime = todoDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'high';
    if (diffDays <= 3) return 'medium';
    return 'low';
}

/**
 * Menghapus semua status error dari input form
 * Menghilangkan styling error dan menyembunyikan pesan error
 */
function clearAllErrors() {
    const errorMessages = document.querySelectorAll('.error-message');
    const inputs = document.querySelectorAll('input');
    
    errorMessages.forEach(error => error.classList.remove('show'));
    inputs.forEach(input => input.classList.remove('error'));
}

/**
 * Menampilkan notifikasi sukses kepada pengguna
 * Membuat dan menampilkan pesan sukses sementara
 * @param {string} message - Pesan sukses yang ditampilkan
 */
function showSuccessMessage(message) {
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

/**
 * Mengubah status selesai dari item todo
 * Ketika tugas utama diselesaikan/dibatalkan, semua subtask mengikuti status yang sama
 * @param {number} id - ID todo yang akan diubah
 */
function toggleTodo(id) {
    const todoIndex = todos.findIndex(todo => todo.id === id);
    if (todoIndex !== -1) {
        todos[todoIndex].completed = !todos[todoIndex].completed;
        
        if (todos[todoIndex].subtasks && todos[todoIndex].subtasks.length > 0) {
            todos[todoIndex].subtasks.forEach(subtask => {
                subtask.completed = todos[todoIndex].completed;
            });
        }
        
        saveTodos();
        updateStats();
        renderTodos();
    }
}

/**
 * Mengubah status selesai dari subtask
 * @param {number} parentId - ID todo induk
 * @param {number} subtaskId - ID subtask yang akan diubah
 */
function toggleSubtask(parentId, subtaskId) {
    const parentIndex = todos.findIndex(todo => todo.id === parentId);
    if (parentIndex !== -1) {
        const subtaskIndex = todos[parentIndex].subtasks.findIndex(sub => sub.id === subtaskId);
        if (subtaskIndex !== -1) {
            todos[parentIndex].subtasks[subtaskIndex].completed = !todos[parentIndex].subtasks[subtaskIndex].completed;
            saveTodos();
            updateStats();
            renderTodos();
        }
    }
}

/**
 * Menghapus item todo dengan konfirmasi
 * Menampilkan dialog konfirmasi sebelum penghapusan permanen
 * @param {number} id - ID todo yang akan dihapus
 */
function deleteTodo(id) {
    // Prevent multiple calls
    if (deleteTodo.isProcessing) {
        return;
    }
    deleteTodo.isProcessing = true;
    
    const todo = todos.find(t => t.id === id);
    if (todo) {
        showConfirmModal(
            `Are you sure you want to delete "${todo.name}"?`,
            () => {
                todos = todos.filter(todo => todo.id !== id);
                saveTodos();
                updateStats();
                renderTodos();
                deleteTodo.isProcessing = false;
            }
        );
    } else {
        deleteTodo.isProcessing = false;
    }
}

/**
 * Menghapus subtask dengan konfirmasi
 * @param {number} parentId - ID todo induk
 * @param {number} subtaskId - ID subtask yang akan dihapus
 */
function deleteSubtask(parentId, subtaskId) {
    // Prevent multiple calls
    if (deleteSubtask.isProcessing) {
        return;
    }
    deleteSubtask.isProcessing = true;
    
    const parentIndex = todos.findIndex(todo => todo.id === parentId);
    if (parentIndex !== -1) {
        const subtask = todos[parentIndex].subtasks.find(sub => sub.id === subtaskId);
        if (subtask) {
            showConfirmModal(
                `Are you sure you want to delete "${subtask.name}"?`,
                () => {
                    todos[parentIndex].subtasks = todos[parentIndex].subtasks.filter(sub => sub.id !== subtaskId);
                    saveTodos();
                    updateStats();
                    renderTodos();
                    deleteSubtask.isProcessing = false;
                }
            );
        } else {
            deleteSubtask.isProcessing = false;
        }
    } else {
        deleteSubtask.isProcessing = false;
    }
}

/**
 * Menghapus semua todos dengan konfirmasi
 * Menampilkan dialog konfirmasi sebelum menghapus semua tugas
 */
function deleteAllTodos() {
    // Prevent multiple calls
    if (deleteAllTodos.isProcessing) {
        return;
    }
    deleteAllTodos.isProcessing = true;
    
    if (todos.length === 0) {
        showSuccessMessage('No tasks to delete!');
        deleteAllTodos.isProcessing = false;
        return;
    }
    
    showConfirmModal(
        `Are you sure you want to delete all ${todos.length} tasks?`,
        () => {
            todos = [];
            saveTodos();
            updateStats();
            renderTodos();
            showSuccessMessage('All tasks deleted!');
            deleteAllTodos.isProcessing = false;
        }
    );
}

/**
 * Membuka modal edit untuk item todo
 * Mengisi form edit dengan data todo saat ini
 * @param {number} id - ID todo yang akan diedit
 */
function editTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        editData = { type: 'todo', todoId: id, subtaskId: null };
        
        document.getElementById('editModalTitle').textContent = 'Edit Task';
        document.getElementById('editNameInput').value = todo.name;
        document.getElementById('editDateInput').value = todo.date;
        
        const modal = document.getElementById('editModal');
        modal.classList.add('show');
        
        const nameInput = document.getElementById('editNameInput');
        nameInput.focus();
        nameInput.select();
    }
}

/**
 * Membuka modal pembuatan subtask
 * @param {number} parentId - ID todo induk
 */
function showSubtaskModal(parentId) {
    currentParentId = parentId;
    const modal = document.getElementById('subtaskModal');
    const input = document.getElementById('subtaskInput');
    
    input.value = '';
    modal.classList.add('show');
    input.focus();
}

/**
 * Menutup modal pembuatan subtask dan mereset form
 */
function closeSubtaskModal() {
    const modal = document.getElementById('subtaskModal');
    const input = document.getElementById('subtaskInput');
    const dateInput = document.getElementById('subtaskDateInput');
    
    modal.classList.remove('show');
    input.value = '';
    dateInput.value = '';
    currentParentId = null;
    
    // Reset processing flags
    addSubtask.isProcessing = false;
}

/**
 * Menambah subtask baru ke todo induk
 * Membuat dan menyimpan subtask dengan validasi
 */
function addSubtask() {
    // Prevent multiple calls by checking if we're already processing
    if (addSubtask.isProcessing) {
        return;
    }
    addSubtask.isProcessing = true;
    
    const input = document.getElementById('subtaskInput');
    const dateInput = document.getElementById('subtaskDateInput');
    const subtaskName = input.value.trim();
    const subtaskDate = dateInput.value;
    
    if (subtaskName === '') {
        showSuccessMessage('Subtask name cannot be empty!');
        addSubtask.isProcessing = false;
        return;
    }
    
    if (currentParentId) {
        const parentIndex = todos.findIndex(todo => todo.id === currentParentId);
        if (parentIndex !== -1) {
            const newSubtask = {
                id: Date.now(),
                name: subtaskName,
                date: subtaskDate || null,
                completed: false,
                createdAt: new Date().toISOString()
            };
            
            todos[parentIndex].subtasks.push(newSubtask);
            saveTodos();
            updateStats();
            renderTodos();
            closeSubtaskModal();
            showSuccessMessage('Subtask added!');
        }
    }
    
    addSubtask.isProcessing = false;
}

/**
 * Mencari melalui todos dan subtask
 * Memperbarui term pencarian dan merender ulang daftar todo
 */
function searchTasks() {
    searchTerm = document.getElementById('searchInput').value.toLowerCase();
    renderTodos();
}

/**
 * Filter todos berdasarkan status atau tanggal
 * Memperbarui filter saat ini dan merender ulang daftar todo
 */
function filterTodos() {
    const filterSelect = document.getElementById('filterSelect');
    currentFilter = filterSelect.value;
    renderTodos();
}

/**
 * Mengurutkan todos berdasarkan kriteria berbeda
 * Mengurutkan array todos dan menyimpan ke storage
 */
function sortTodos() {
    const sortSelect = document.getElementById('sortSelect');
    currentSort = sortSelect.value;
    
    switch (currentSort) {
        case 'name':
            todos.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'date':
            todos.sort((a, b) => new Date(a.date) - new Date(b.date));
            break;
        case 'priority':
            const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
            todos.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
            break;
        case 'created':
        default:
            todos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
    }
    
    saveTodos();
    renderTodos();
}

/**
 * Mendapatkan todos yang difilter berdasarkan filter dan term pencarian saat ini
 * @returns {Array} Array todos yang sudah difilter
 */
function getFilteredTodos() {
    const today = new Date().toISOString().split('T')[0];
    let filtered = todos;
    
    switch (currentFilter) {
        case 'completed':
            filtered = todos.filter(todo => todo.completed);
            break;
        case 'pending':
            filtered = todos.filter(todo => !todo.completed);
            break;
        case 'today':
            filtered = todos.filter(todo => todo.date === today);
            break;
        case 'upcoming':
            filtered = todos.filter(todo => todo.date > today);
            break;
        default:
            filtered = todos;
    }
    
    if (searchTerm) {
        filtered = filtered.filter(todo => 
            todo.name.toLowerCase().includes(searchTerm) ||
            (todo.subtasks && todo.subtasks.some(sub => sub.name.toLowerCase().includes(searchTerm)))
        );
    }
    
    return filtered;
}

/**
 * Merender todos ke DOM
 * Menghasilkan HTML untuk todos dan subtask, menangani status kosong
 */
function renderTodos() {
    const todoTableBody = document.getElementById('todoTableBody');
    const emptyState = document.getElementById('emptyState');
    const filteredTodos = getFilteredTodos();
    
    if (filteredTodos.length === 0) {
        const todoRows = todoTableBody.querySelectorAll('.todo-row, .subtask-row');
        todoRows.forEach(row => row.remove());
        emptyState.classList.add('show');
        return;
    }
    
    emptyState.classList.remove('show');
    const todoRows = todoTableBody.querySelectorAll('.todo-row, .subtask-row');
    todoRows.forEach(row => row.remove());
    
    const todoHtml = filteredTodos.map(todo => generateTodoHTML(todo)).join('');
    todoTableBody.insertAdjacentHTML('afterbegin', todoHtml);
}

/**
 * Menghasilkan HTML untuk satu item todo
 * @param {Object} todo - Objek todo yang akan dirender
 * @returns {string} String HTML untuk todo
 */
function generateTodoHTML(todo) {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    let dateClass = '';
    let dateIcon = 'fas fa-calendar';
    
    if (todo.date < todayString && !todo.completed) {
        dateClass = 'overdue';
        dateIcon = 'fas fa-exclamation-triangle';
    } else if (todo.date === todayString) {
        dateClass = 'today';
        dateIcon = 'fas fa-calendar-day';
    }
    
    const formattedDate = formatDate(todo.date);
    
    let statusClass = 'pending';
    let statusText = 'Pending';
    
    if (todo.completed) {
        statusClass = 'completed';
        statusText = 'Completed';
    } else if (todo.date < todayString) {
        statusClass = 'overdue';
        statusText = 'Overdue';
    }

    const hasSubtasks = todo.subtasks && todo.subtasks.length > 0;
    const isExpanded = todo.expanded || false;
    
    let html = generateMainTaskHTML(todo, dateClass, dateIcon, formattedDate, statusClass, statusText, hasSubtasks, isExpanded);

    if (hasSubtasks && isExpanded) {
        todo.subtasks.forEach(subtask => {
            html += generateSubtaskHTML(todo.id, subtask, today);
        });
    }
    
    return html;
}

/**
 * Menghasilkan HTML untuk baris tugas utama
 * @param {Object} todo - Objek todo
 * @param {string} dateClass - CSS class untuk styling tanggal
 * @param {string} dateIcon - Class icon FontAwesome
 * @param {string} formattedDate - String tanggal yang diformat
 * @param {string} statusClass - CSS class untuk styling status
 * @param {string} statusText - Teks status yang ditampilkan
 * @param {boolean} hasSubtasks - Apakah todo memiliki subtask
 * @param {boolean} isExpanded - Apakah subtask diperluas
 * @returns {string} String HTML untuk tugas utama
 */
function generateMainTaskHTML(todo, dateClass, dateIcon, formattedDate, statusClass, statusText, hasSubtasks, isExpanded) {
    return `
        <div class="todo-row ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
            <div class="row-checkbox">
                <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} 
                       onchange="toggleTodo(${todo.id})">
            </div>
            <div class="row-task">
                <div class="task-content">
                    <div class="task-main">
                        <span class="expand-icon ${hasSubtasks ? (isExpanded ? 'expanded' : '') : 'empty'}" 
                              onclick="toggleSubtasks(${todo.id})" title="${hasSubtasks ? 'Toggle subtasks' : ''}">
                            ${hasSubtasks ? '<i class="fas fa-chevron-right"></i>' : ''}
                        </span>
                        <span class="task-name ${todo.completed ? 'completed' : ''}">${escapeHtml(todo.name)}</span>
                        ${hasSubtasks ? `<span class="subtask-count">${todo.subtasks.length}</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="row-date">
                <div class="due-date ${dateClass}">
                    <i class="${dateIcon}"></i>
                    ${formattedDate}
                </div>
            </div>
            <div class="row-status">
                <div class="task-status ${statusClass}">${statusText}</div>
            </div>
            <div class="row-actions">
                <div class="task-actions">
                    <button class="action-btn btn-subtask" onclick="showSubtaskModal(${todo.id})" title="Add Subtask">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="action-btn btn-edit" onclick="editTodo(${todo.id})" title="Edit Task">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="deleteTodo(${todo.id})" title="Delete Task">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="task-actions-mobile">
                    <button class="action-btn btn-subtask" onclick="showSubtaskModal(${todo.id})" title="Add Subtask">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="action-btn btn-edit" onclick="editTodo(${todo.id})" title="Edit Task">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="deleteTodo(${todo.id})" title="Delete Task">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>`;
}

/**
 * Menghasilkan HTML untuk baris subtask
 * @param {number} parentId - ID todo induk
 * @param {Object} subtask - Objek subtask
 * @param {Date} today - Objek tanggal hari ini
 * @returns {string} String HTML untuk subtask
 */
function generateSubtaskHTML(parentId, subtask, today) {
    let subtaskDateDisplay = 'No due date';
    let subtaskDateClass = '';
    let subtaskDateIcon = '';
    
    if (subtask.date) {
        const subtaskFormattedDate = formatDate(subtask.date);
        const subtaskTodayString = today.toISOString().split('T')[0];
        
        if (subtask.date < subtaskTodayString && !subtask.completed) {
            subtaskDateClass = 'overdue';
            subtaskDateIcon = 'fas fa-exclamation-triangle';
        } else if (subtask.date === subtaskTodayString) {
            subtaskDateClass = 'today';
            subtaskDateIcon = 'fas fa-calendar-day';
        } else {
            subtaskDateIcon = 'fas fa-calendar';
        }
        
        subtaskDateDisplay = `<i class="${subtaskDateIcon}"></i> ${subtaskFormattedDate}`;
    }
    
    return `
        <div class="subtask-row" data-parent-id="${parentId}" data-subtask-id="${subtask.id}">
            <div class="row-checkbox">
                <input type="checkbox" class="subtask-checkbox" ${subtask.completed ? 'checked' : ''} 
                       onchange="toggleSubtask(${parentId}, ${subtask.id})">
            </div>
            <div class="row-task">
                <div class="subtask-item">
                    <span class="subtask-name ${subtask.completed ? 'completed' : ''}">${escapeHtml(subtask.name)}</span>
                </div>
            </div>
            <div class="row-date">
                <div class="due-date ${subtaskDateClass}">
                    ${subtaskDateDisplay}
                </div>
            </div>
            <div class="row-status">
                <div class="task-status ${subtask.completed ? 'completed' : 'pending'}">
                    ${subtask.completed ? 'Completed' : 'Pending'}
                </div>
            </div>
            <div class="row-actions">
                <div class="task-actions">
                    <button class="action-btn btn-edit" onclick="editSubtask(${parentId}, ${subtask.id})" title="Edit Subtask">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="deleteSubtask(${parentId}, ${subtask.id})" title="Delete Subtask">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>`;
}

/**
 * Mengubah visibilitas subtask untuk todo
 * @param {number} todoId - ID todo untuk mengubah subtask
 */
function toggleSubtasks(todoId) {
    const todo = todos.find(t => t.id === todoId);
    if (todo && todo.subtasks && todo.subtasks.length > 0) {
        todo.expanded = !todo.expanded;
        saveTodos();
        renderTodos();
    }
}

/**
 * Membuka modal edit untuk subtask
 * @param {number} todoId - ID todo induk
 * @param {number} subtaskId - ID subtask yang akan diedit
 */
function editSubtask(todoId, subtaskId) {
    const todo = todos.find(t => t.id === todoId);
    if (todo) {
        const subtask = todo.subtasks.find(s => s.id === subtaskId);
        if (subtask) {
            editData = { type: 'subtask', todoId: todoId, subtaskId: subtaskId };
            
            document.getElementById('editModalTitle').textContent = 'Edit Subtask';
            document.getElementById('editNameInput').value = subtask.name;
            document.getElementById('editDateInput').value = subtask.date || '';
            
            const modal = document.getElementById('editModal');
            modal.classList.add('show');
            
            const nameInput = document.getElementById('editNameInput');
            nameInput.focus();
            nameInput.select();
        }
    }
}

/**
 * Memformat string tanggal untuk tampilan
 * @param {string} dateString - Tanggal dalam format YYYY-MM-DD
 * @returns {string} String tanggal yang diformat
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayString = today.toISOString().split('T')[0];
    const tomorrowString = tomorrow.toISOString().split('T')[0];
    const yesterdayString = yesterday.toISOString().split('T')[0];
    
    if (dateString === todayString) {
        return 'Today';
    } else if (dateString === tomorrowString) {
        return 'Tomorrow';
    } else if (dateString === yesterdayString) {
        return 'Yesterday';
    } else {
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        };
        return date.toLocaleDateString('en-US', options);
    }
}

/**
 * Escape karakter HTML untuk mencegah serangan XSS
 * @param {string} text - Teks yang akan di-escape
 * @returns {string} Teks yang sudah di-escape
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

/**
 * Menampilkan modal konfirmasi dengan pesan kustom
 * @param {string} message - Pesan konfirmasi yang ditampilkan
 * @param {Function} callback - Fungsi yang dijalankan saat konfirmasi
 */
function showConfirmModal(message, callback) {
    const modal = document.getElementById('confirmModal');
    const messageElement = document.getElementById('confirmMessage');
    
    messageElement.textContent = message;
    confirmCallback = callback;
    modal.classList.add('show');
}

/**
 * Menutup modal konfirmasi dan mereset callback
 */
function closeModal() {
    const modal = document.getElementById('confirmModal');
    modal.classList.remove('show');
    confirmCallback = null;
    
    // Reset processing flags
    if (typeof deleteTodo !== 'undefined') deleteTodo.isProcessing = false;
    if (typeof deleteSubtask !== 'undefined') deleteSubtask.isProcessing = false;
    if (typeof deleteAllTodos !== 'undefined') deleteAllTodos.isProcessing = false;
}

/**
 * Menjalankan aksi yang dikonfirmasi dan menutup modal
 */
function confirmAction() {
    if (confirmCallback) {
        confirmCallback();
        closeModal();
    }
}

/**
 * Mengatur shortcut keyboard untuk aplikasi
 * Menangani Ctrl+Enter untuk menambah todo dan Escape untuk menutup modal
 */
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'Enter') {
        addTodo();
    }
    
    if (e.key === 'Escape') {
        closeModal();
        closeSubtaskModal();
        closeEditModal();
    }
});

/**
 * Menutup modal edit dan mereset data form
 */
function closeEditModal() {
    const modal = document.getElementById('editModal');
    modal.classList.remove('show');
    
    document.getElementById('editNameInput').value = '';
    document.getElementById('editDateInput').value = '';
    editData = { type: null, todoId: null, subtaskId: null };
    
    // Reset processing flags
    confirmEdit.isProcessing = false;
}

/**
 * Mengkonfirmasi dan menyimpan perubahan edit
 * Memvalidasi input dan memperbarui todo atau subtask yang sesuai
 */
function confirmEdit() {
    // Prevent multiple calls by checking if we're already processing
    if (confirmEdit.isProcessing) {
        return;
    }
    confirmEdit.isProcessing = true;
    
    const newName = document.getElementById('editNameInput').value.trim();
    const newDate = document.getElementById('editDateInput').value;
    
    if (!newName) {
        showSuccessMessage('Name cannot be empty!');
        confirmEdit.isProcessing = false;
        return;
    }
    
    if (editData.type === 'todo') {
        const todoIndex = todos.findIndex(todo => todo.id === editData.todoId);
        if (todoIndex !== -1) {
            todos[todoIndex].name = newName;
            todos[todoIndex].date = newDate;
            saveTodos();
            updateStats();
            renderTodos();
            showSuccessMessage('Task updated successfully!');
        }
    } else if (editData.type === 'subtask') {
        const todo = todos.find(t => t.id === editData.todoId);
        if (todo) {
            const subtask = todo.subtasks.find(s => s.id === editData.subtaskId);
            if (subtask) {
                subtask.name = newName;
                subtask.date = newDate;
                saveTodos();
                updateStats();
                renderTodos();
                showSuccessMessage('Subtask updated successfully!');
            }
        }
    }
    
    closeEditModal();
    confirmEdit.isProcessing = false;
}
