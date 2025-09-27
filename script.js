// Configuración de Supabase
const supabaseUrl = 'https://TU_PROYECTO.supabase.co';
const supabaseKey = 'TU_ANON_KEY';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Configuración de Telegram
const telegramToken = 'TU_TELEGRAM_TOKEN';
const telegramChatId = 'TU_CHAT_ID';

// Variables globales
let currentUser = null;

// Cargar página según autenticación
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupEventListeners();
});

// Función para verificar autenticación
function checkAuth() {
    const token = localStorage.getItem('auth_token');
    if (token) {
        verifyToken(token);
    } else {
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }
}

// Función para verificar token
async function verifyToken(token) {
    const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('token', token)
        .single();

    if (error || !data) {
        localStorage.removeItem('auth_token');
        window.location.href = 'login.html';
    } else {
        currentUser = data;
        if (window.location.pathname.includes('login.html')) {
            window.location.href = 'dashboard.html';
        } else {
            loadPageData();
        }
    }
}

// Función para configurar eventos
function setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', addProduct);
    }

    const ventaForm = document.getElementById('ventaForm');
    if (ventaForm) {
        ventaForm.addEventListener('submit', handleVenta);
    }

    const ventasBtn = document.getElementById('ventas-btn');
    if (ventasBtn) {
        ventasBtn.addEventListener('click', () => {
            window.location.href = 'ventas.html';
        });
    }

    // Eventos para formulario de ventas
    const metodoPago = document.getElementById('metodo_pago');
    if (metodoPago) {
        metodoPago.addEventListener('change', toggleClienteSection);
    }
}

// Función para cargar datos según la página
function loadPageData() {
    if (window.location.pathname.includes('dashboard.html')) {
        loadDashboard();
    } else if (window.location.pathname.includes('ventas.html')) {
        loadVentasForm();
    }
}

// Función para manejar login
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('username', username)
        .single();

    if (error || !data) {
        alert('Usuario no encontrado');
        return;
    }

    if (data.password !== password) {
        alert('Contraseña incorrecta');
        return;
    }

    const token = generateToken();
    
    await supabase
        .from('usuarios')
        .update({ token: token })
        .eq('id', data.id);

    localStorage.setItem('auth_token', token);
    window.location.href = 'dashboard.html';
}

// Función para manejar logout
function handleLogout() {
    localStorage.removeItem('auth_token');
    window.location.href = 'login.html';
}

// Función para manejar venta
async function handleVenta(e) {
    e.preventDefault();
    
    const metodoPago = document.getElementById('metodo_pago').value;
    const cliente_nombre = document.getElementById('cliente_nombre').value;
    const cliente_apellido = document.getElementById('cliente_apellido').value;
    const cliente_dni = document.getElementById('cliente_dni').value;
    const cliente_telefono = document.getElementById('cliente_telefono').value;
    const codigo_pago = document.getElementById('codigo_pago').value;
    const banco = document.getElementById('banco').value;

    if (metodoPago !== 'efectivo') {
        if (!cliente_nombre || !cliente_apellido || !cliente_dni || !cliente_telefono) {
            alert('Los datos del cliente son requeridos para pagos electrónicos');
            return;
        }
    }

    // Recoger productos
    const items = [];
    const rows = document.querySelectorAll('.item-row');
    rows.forEach(row => {
        const productoSelect = row.querySelector('.producto-select');
        const cantidadInput = row.querySelector('.cantidad-input');
        const productoId = productoSelect.value;
        const cantidad = parseInt(cantidadInput.value);

        if (productoId && cantidad > 0) {
            items.push({
                producto_id: productoId,
                cantidad: cantidad
            });
        }
    });

    if (items.length === 0) {
        alert('Debes seleccionar al menos un producto');
        return;
    }

    // Calcular total
    let total = 0;
    for (const item of items) {
        const { data, error } = await supabase
            .from('productos')
            .select('precio')
            .eq('id', item.producto_id)
            .single();

        if (!error && data) {
            total += data.precio * item.cantidad;
        }
    }

    // Registrar venta
    const { data: venta, error: ventaError } = await supabase
        .from('ventas')
        .insert([{
            usuario_id: currentUser.id,
            cliente_nombre: cliente_nombre || '',
            cliente_apellido: cliente_apellido || '',
            cliente_dni: cliente_dni || '',
            cliente_telefono: cliente_telefono || '',
            metodo_pago: metodoPago,
            codigo_pago: codigo_pago || '',
            banco: banco || '',
            total: total
        }]);

    if (ventaError) {
        alert('Error al registrar venta: ' + ventaError.message);
        return;
    }

    // Registrar items y actualizar stock
    const ventaId = venta[0].id;
    for (const item of items) {
        await supabase
            .from('venta_items')
            .insert([{
                venta_id: ventaId,
                producto_id: item.producto_id,
                cantidad: item.cantidad,
                subtotal: 0
            }]);

        const { data: producto, error } = await supabase
            .from('productos')
            .select('stock, precio')
            .eq('id', item.producto_id)
            .single();

        if (!error && producto) {
            const nuevoStock = producto.stock - item.cantidad;
            await supabase
                .from('productos')
                .update({ stock: nuevoStock })
                .eq('id', item.producto_id);

            await supabase
                .from('venta_items')
                .update({ subtotal: producto.precio * item.cantidad })
                .eq('venta_id', ventaId)
                .eq('producto_id', item.producto_id);
        }
    }

    // Enviar notificación a Telegram
    const mensaje = `?? Nueva venta:\nCliente: ${cliente_nombre || 'Efectivo'} ${cliente_apellido || ''}\nMétodo: ${metodoPago}\nTotal: ${total} CUP`;
    
    fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: telegramChatId,
            text: mensaje
        })
    });

    alert('? Venta registrada exitosamente!');
    location.reload();
}

// Función para cargar dashboard
async function loadDashboard() {
    if (!currentUser) return;

    document.getElementById('username-display').textContent = currentUser.nombre || currentUser.username;

    await loadInventory();
    await loadStats();
}

// Función para cargar formulario de ventas
async function loadVentasForm() {
    if (!currentUser) return;

    document.getElementById('username-display').textContent = currentUser.nombre || currentUser.username;
    await cargarProductos();
    toggleClienteSection();
}

// Función para cargar inventario
async function loadInventory() {
    const { data, error } = await supabase
        .from('productos')
        .select('*');

    if (error) return;

    const tbody = document.getElementById('inventory-body');
    tbody.innerHTML = '';

    data.forEach(producto => {
        const row = document.createElement('tr');
        const stockClass = producto.stock < 5 ? 'low-stock' : '';
        
        row.innerHTML = `
            <td class="${stockClass}">${producto.nombre}</td>
            <td class="${stockClass}">${producto.precio} CUP</td>
            <td class="${stockClass}">${producto.stock}</td>
            <td>
                <button class="btn btn-secondary" onclick="editarProducto('${producto.id}')">Editar</button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Función para cargar estadísticas
async function loadStats() {
    const hoy = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .eq('usuario_id', currentUser.id)
        .gte('creado_en', `${hoy}T00:00:00`)
        .lt('creado_en', `${hoy}T23:59:59`);

    if (error) return;

    let totalVendido = 0;
    let totalEfectivo = 0;
    let totalTransferencia = 0;

    data.forEach(venta => {
        totalVendido += parseFloat(venta.total);
        if (venta.metodo_pago === 'efectivo') {
            totalEfectivo += parseFloat(venta.total);
        } else {
            totalTransferencia += parseFloat(venta.total);
        }
    });

    document.getElementById('total-vendido').textContent = `${totalVendido.toFixed(2)} CUP`;
    document.getElementById('total-efectivo').textContent = `${totalEfectivo.toFixed(2)} CUP`;
    document.getElementById('total-transferencia').textContent = `${totalTransferencia.toFixed(2)} CUP`;
}

// Función para cargar productos en formulario de ventas
async function cargarProductos() {
    const { data, error } = await supabase
        .from('productos')
        .select('*');

    if (error) return;

    const selects = document.querySelectorAll('.producto-select');
    selects.forEach(select => {
        select.innerHTML = '<option value="">Selecciona producto</option>';
        data.forEach(producto => {
            const option = document.createElement('option');
            option.value = producto.id;
            option.textContent = `${producto.nombre} - ${producto.precio} CUP (Stock: ${producto.stock})`;
            option.dataset.precio = producto.precio;
            option.dataset.stock = producto.stock;
            select.appendChild(option);
        });
    });
}

// Función para alternar sección de cliente
function toggleClienteSection() {
    const metodoPago = document.getElementById('metodo_pago');
    const clienteSection = document.getElementById('cliente-section');

    if (metodoPago.value !== 'efectivo') {
        clienteSection.classList.remove('hidden');
        document.getElementById('cliente_nombre').required = true;
        document.getElementById('cliente_apellido').required = true;
        document.getElementById('cliente_dni').required = true;
        document.getElementById('cliente_telefono').required = true;
    } else {
        clienteSection.classList.add('hidden');
        document.getElementById('cliente_nombre').required = false;
        document.getElementById('cliente_apellido').required = false;
        document.getElementById('cliente_dni').required = false;
        document.getElementById('cliente_telefono').required = false;
    }
}

// Función para agregar producto
async function addProduct() {
    const nombre = document.getElementById('producto-nombre').value;
    const precio = parseFloat(document.getElementById('producto-precio').value);
    const stock = parseInt(document.getElementById('producto-stock').value);

    if (!nombre || !precio || !stock) {
        alert('Por favor, completa todos los campos');
        return;
    }

    const { error } = await supabase
        .from('productos')
        .insert([{
            nombre: nombre,
            precio: precio,
            stock: stock
        }]);

    if (error) {
        alert('Error al agregar producto: ' + error.message);
        return;
    }

    document.getElementById('producto-nombre').value = '';
    document.getElementById('producto-precio').value = '';
    document.getElementById('producto-stock').value = '';

    await loadInventory();
    alert('Producto agregado exitosamente!');
}

// Función para agregar producto en formulario de ventas
function addItem() {
    const container = document.getElementById('productos-container');
    const newRow = document.createElement('div');
    newRow.className = 'item-row';

    newRow.innerHTML = `
        <div class="form-group">
            <label>Producto</label>
            <select class="input producto-select" required>
                <option value="">Cargando productos...</option>
            </select>
        </div>
        <div class="form-group">
            <label>Cantidad</label>
            <input type="number" min="1" value="1" class="input cantidad-input" required>
        </div>
        <button type="button" class="remove-btn" onclick="removeItem(this)">Eliminar</button>
    `;

    container.appendChild(newRow);
    cargarProductos();
}

// Función para eliminar producto
function removeItem(button) {
    if (document.querySelectorAll('.item-row').length > 1) {
        button.parentElement.remove();
    } else {
        alert('Debe haber al menos un producto');
    }
}

// Función para generar token
function generateToken() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
}

// Función para editar producto
function editarProducto(id) {
    alert('Editar producto: ' + id);
}