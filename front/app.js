// Variables globales
let productos = [];
let carrito = [];
let ordenActual = null;

// URL de la API (cambiar en producción)
const API_URL = window.location.origin;

// Inicializar app
document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();
    actualizarBadgeCarrito();
    
    // Event listener para el formulario
    const form = document.getElementById('form-checkout');
    if (form) {
        form.addEventListener('submit', procesarCheckout);
    }
});

// Navegación entre vistas
function mostrarVista(nombreVista) {
    // Ocultar todas las vistas
    document.querySelectorAll('.vista').forEach(vista => {
        vista.classList.add('oculto');
    });
    
    // Mostrar la vista solicitada
    const vistaActiva = document.getElementById(`vista-${nombreVista}`);
    if (vistaActiva) {
        vistaActiva.classList.remove('oculto');
    }
    
    // Acciones específicas por vista
    switch(nombreVista) {
        case 'carrito':
            cargarCarrito();
            break;
        case 'checkout':
            cargarCheckout();
            break;
        case 'catalogo':
            cargarProductos();
            break;
    }
    
    // Scroll al inicio
    window.scrollTo(0, 0);
}

// Cargar productos desde la API
async function cargarProductos() {
    try {
        const response = await fetch(`${API_URL}/api/productos`);
        const data = await response.json();
        productos = data.productos;
        renderizarProductos();
    } catch (error) {
        console.error('Error cargando productos:', error);
        alert('Error al cargar los productos');
    }
}

// Renderizar productos en el catálogo
function renderizarProductos() {
    const grid = document.getElementById('productos-grid');
    grid.innerHTML = '';
    
    productos.forEach(producto => {
        const card = document.createElement('div');
        card.className = 'producto-card';
        card.innerHTML = `
            <div class="producto-emoji">${producto.imagen}</div>
            <h3>${producto.nombre}</h3>
            <p>${producto.descripcion}</p>
            <div class="producto-precio">$${formatearPrecio(producto.precio)}</div>
            <button class="btn" onclick="agregarAlCarrito(${producto.id})">
                Agregar al carrito
            </button>
        `;
        grid.appendChild(card);
    });
}

// Agregar producto al carrito
async function agregarAlCarrito(productoId) {
    try {
        const response = await fetch(`${API_URL}/api/carrito/agregar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                producto_id: productoId,
                cantidad: 1
            })
        });
        
        const data = await response.json();
        
        // Feedback visual
        mostrarNotificacion('¡Producto agregado al carrito!');
        actualizarBadgeCarrito();
        
    } catch (error) {
        console.error('Error agregando al carrito:', error);
        alert('Error al agregar el producto');
    }
}

// Cargar carrito
async function cargarCarrito() {
    try {
        const response = await fetch(`${API_URL}/api/carrito`);
        const data = await response.json();
        carrito = data.items;
        
        if (carrito.length === 0) {
            document.getElementById('carrito-vacio').classList.remove('oculto');
            document.getElementById('carrito-contenido').classList.add('oculto');
        } else {
            document.getElementById('carrito-vacio').classList.add('oculto');
            document.getElementById('carrito-contenido').classList.remove('oculto');
            renderizarCarrito(data);
        }
        
        actualizarBadgeCarrito();
    } catch (error) {
        console.error('Error cargando carrito:', error);
    }
}

// Renderizar items del carrito
function renderizarCarrito(data) {
    const contenedor = document.getElementById('carrito-items');
    contenedor.innerHTML = '';
    
    data.items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'carrito-item';
        itemDiv.innerHTML = `
            <div class="carrito-item-info">
                <div class="carrito-item-emoji">${item.producto.imagen}</div>
                <div class="carrito-item-detalles">
                    <h4>${item.producto.nombre}</h4>
                    <p>Cantidad: ${item.cantidad}</p>
                </div>
            </div>
            <div class="carrito-item-acciones">
                <div class="carrito-item-precio">$${formatearPrecio(item.producto.precio * item.cantidad)}</div>
                <button class="btn-eliminar" onclick="eliminarDelCarrito(${item.producto_id})">
                    🗑️ Eliminar
                </button>
            </div>
        `;
        contenedor.appendChild(itemDiv);
    });
    
    // Actualizar total
    document.getElementById('carrito-total').textContent = formatearPrecio(data.total);
}

// Eliminar del carrito
async function eliminarDelCarrito(productoId) {
    try {
        await fetch(`${API_URL}/api/carrito/${productoId}`, {
            method: 'DELETE'
        });
        
        cargarCarrito();
        mostrarNotificacion('Producto eliminado del carrito');
    } catch (error) {
        console.error('Error eliminando del carrito:', error);
    }
}

// Cargar checkout
async function cargarCheckout() {
    try {
        const response = await fetch(`${API_URL}/api/carrito`);
        const data = await response.json();
        
        // Renderizar resumen
        const resumenContainer = document.getElementById('checkout-items');
        resumenContainer.innerHTML = '';
        
        data.items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'checkout-item';
            itemDiv.innerHTML = `
                <span>${item.producto.nombre} x${item.cantidad}</span>
                <span>$${formatearPrecio(item.producto.precio * item.cantidad)}</span>
            `;
            resumenContainer.appendChild(itemDiv);
        });
        
        // Actualizar totales
        document.getElementById('checkout-total').textContent = formatearPrecio(data.total);
        document.getElementById('resumen-total').textContent = formatearPrecio(data.total);
        
    } catch (error) {
        console.error('Error cargando checkout:', error);
    }
}

// Procesar checkout
async function procesarCheckout(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('nombre').value;
    const email = document.getElementById('email').value;
    const telefono = document.getElementById('telefono').value;
    
    try {
        // Obtener carrito actual
        const carritoResponse = await fetch(`${API_URL}/api/carrito`);
        const carritoData = await carritoResponse.json();
        
        // Preparar orden
        const orden = {
            items: carritoData.items.map(item => ({
                producto_id: item.producto_id,
                cantidad: item.cantidad
            })),
            total: carritoData.total,
            nombre: nombre,
            email: email
        };
        
        // Enviar orden
        const response = await fetch(`${API_URL}/api/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orden)
        });
        
        const data = await response.json();
        ordenActual = data;
        
        // Limpiar carrito
        await fetch(`${API_URL}/api/limpiar-carrito`, { method: 'POST' });
        
        // Mostrar confirmación
        mostrarConfirmacion(data, email, carritoData.total);
        
    } catch (error) {
        console.error('Error procesando checkout:', error);
        alert('Error al procesar el pago. Intenta nuevamente.');
    }
}

// Mostrar vista de confirmación
function mostrarConfirmacion(data, email, total) {
    document.getElementById('orden-id').textContent = data.orden_id;
    document.getElementById('orden-total').textContent = formatearPrecio(total);
    document.getElementById('orden-email').textContent = email;
    
    mostrarVista('confirmacion');
}

// Volver al inicio
function volverInicio() {
    // Limpiar formulario
    document.getElementById('form-checkout').reset();
    ordenActual = null;
    
    // Volver al catálogo
    mostrarVista('catalogo');
    actualizarBadgeCarrito();
}

// Actualizar badge del carrito
async function actualizarBadgeCarrito() {
    try {
        const response = await fetch(`${API_URL}/api/carrito`);
        const data = await response.json();
        document.getElementById('badge-cantidad').textContent = data.cantidad_items;
    } catch (error) {
        console.error('Error actualizando badge:', error);
    }
}

// Helpers
function formatearPrecio(precio) {
    return precio.toLocaleString('es-CL');
}

function mostrarNotificacion(mensaje) {
    // Simple notificación (puedes mejorarla)
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #667eea;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    notif.textContent = mensaje;
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.remove();
    }, 3000);
}

// CSS para animación
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);