# How to Build WebSocket APIs with Flask-SocketIO

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Flask, Python, WebSocket, Socket.IO, Real-time, Async

Description: Learn how to build real-time WebSocket applications with Flask-SocketIO including events, rooms, namespaces, and scaling with message queues.

---

> Flask-SocketIO brings Socket.IO to Flask, enabling real-time bidirectional communication between clients and servers. Unlike raw WebSockets, Socket.IO provides automatic reconnection, room support, and namespace organization out of the box.

Real-time features like live notifications, chat, dashboards, and collaborative editing all benefit from WebSockets. Flask-SocketIO makes building these features straightforward.

---

## What is Flask-SocketIO?

Flask-SocketIO is a Flask extension that adds Socket.IO support to your application. Socket.IO is a library that enables real-time, event-based communication between browsers and servers.

Key features include:
- **Event-based communication** - Send and receive named events with data
- **Rooms** - Group clients for targeted broadcasting
- **Namespaces** - Organize events into separate channels
- **Automatic reconnection** - Clients reconnect automatically after disconnects
- **Fallback support** - Falls back to HTTP long-polling if WebSockets are unavailable

---

## Installing and Configuring Flask-SocketIO

Install Flask-SocketIO with an async server. For production, use eventlet or gevent.

```python
# requirements.txt
# Core dependencies for Flask-SocketIO
flask>=2.0.0
flask-socketio>=5.3.0
eventlet>=0.33.0  # Async server (recommended for production)
python-socketio>=5.0.0
```

Basic application setup with configuration options:

```python
# app.py
# Flask-SocketIO basic setup
from flask import Flask
from flask_socketio import SocketIO

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'  # Required for session support

# Initialize SocketIO with Flask app
# async_mode determines the underlying async framework
socketio = SocketIO(
    app,
    cors_allowed_origins="*",  # Allow all origins (configure for production)
    async_mode='eventlet',  # Use eventlet for async (alternatives: gevent, threading)
    ping_timeout=60,  # Seconds before considering connection dead
    ping_interval=25  # Seconds between ping packets
)

if __name__ == '__main__':
    # Use socketio.run() instead of app.run() for WebSocket support
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
```

---

## Creating Event Handlers

Event handlers respond to client events. The `@socketio.on` decorator registers a function to handle a specific event. Return values are sent back to the client as acknowledgments.

```python
# events.py
# Event handlers for client communication
from flask_socketio import SocketIO, emit

socketio = SocketIO()

@socketio.on('connect')
def handle_connect():
    """Called when a client connects"""
    print(f"Client connected: {request.sid}")  # request.sid is unique session ID
    # Connection is accepted by default
    # Return False to reject the connection

@socketio.on('disconnect')
def handle_disconnect():
    """Called when a client disconnects"""
    print(f"Client disconnected: {request.sid}")

@socketio.on('message')
def handle_message(data):
    """Handle the default 'message' event"""
    print(f"Received message: {data}")
    # Send response back to the same client
    emit('response', {'status': 'received', 'data': data})

@socketio.on('custom_event')
def handle_custom_event(payload):
    """Handle a custom named event with JSON payload"""
    username = payload.get('username')
    content = payload.get('content')

    # Process the event
    print(f"Custom event from {username}: {content}")

    # Return value is sent as acknowledgment to client
    return {'status': 'ok', 'message': 'Event processed'}
```

Handling events with multiple arguments:

```python
@socketio.on('multi_arg_event')
def handle_multi_args(arg1, arg2, arg3):
    """Handle events with multiple positional arguments"""
    print(f"Received: {arg1}, {arg2}, {arg3}")
    return True  # Acknowledgment
```

---

## Emitting Events to Clients

Flask-SocketIO provides several ways to send events to clients. Use `emit()` for targeted sending and `send()` for the default message event.

```python
# emitting.py
# Different ways to emit events to clients
from flask_socketio import emit, send
from flask import request

@socketio.on('chat_message')
def handle_chat(data):
    """Demonstrate different emit patterns"""

    # Emit to the sender only (default behavior)
    emit('notification', {'msg': 'Message received'})

    # Emit to all connected clients including sender
    emit('new_message', data, broadcast=True)

    # Emit to all clients except sender
    emit('new_message', data, broadcast=True, include_self=False)

    # Emit to a specific client by session ID
    target_sid = data.get('target_sid')
    emit('private_message', data, to=target_sid)

    # Send using the default 'message' event
    send('This uses the message event', broadcast=True)

def emit_from_outside_handler():
    """Emit events from outside event handlers (background tasks, HTTP routes)"""
    # Use socketio instance directly with namespace
    socketio.emit('server_notification', {'msg': 'Hello!'}, namespace='/')

    # Emit to specific room
    socketio.emit('update', {'data': 'New data'}, room='dashboard')
```

Emitting from HTTP routes:

```python
@app.route('/trigger-event')
def trigger_event():
    """HTTP endpoint that triggers a WebSocket event"""
    # Emit to all connected clients from HTTP context
    socketio.emit('http_triggered', {'source': 'HTTP route'})
    return {'status': 'Event emitted'}
```

---

## Rooms for Group Messaging

Rooms allow you to group clients and broadcast to specific groups. Clients can join and leave rooms dynamically. Every client automatically joins a room named with their session ID.

```python
# rooms.py
# Room management for group messaging
from flask_socketio import join_room, leave_room, emit, rooms
from flask import request

@socketio.on('join')
def on_join(data):
    """Handle room join requests"""
    room = data.get('room')
    username = data.get('username')

    # Add client to the room
    join_room(room)

    # Notify room members about new user
    emit('user_joined', {
        'username': username,
        'room': room,
        'message': f'{username} has joined the room'
    }, to=room)

@socketio.on('leave')
def on_leave(data):
    """Handle room leave requests"""
    room = data.get('room')
    username = data.get('username')

    # Remove client from the room
    leave_room(room)

    # Notify remaining room members
    emit('user_left', {
        'username': username,
        'message': f'{username} has left the room'
    }, to=room)

@socketio.on('room_message')
def on_room_message(data):
    """Send message to a specific room"""
    room = data.get('room')
    message = data.get('message')
    username = data.get('username')

    # Broadcast to all clients in the room
    emit('room_broadcast', {
        'room': room,
        'username': username,
        'message': message
    }, to=room)

@socketio.on('get_my_rooms')
def get_my_rooms():
    """Return list of rooms the client is in"""
    client_rooms = rooms()  # Returns list of rooms for current client
    # First room is always the client's session ID room
    return {'rooms': list(client_rooms)}
```

---

## Namespaces for Organization

Namespaces let you split application logic into separate channels on a single connection. Each namespace has its own event handlers and rooms. Use namespaces to organize features like chat, notifications, and admin functions.

```python
# namespaces.py
# Organizing events with namespaces
from flask_socketio import Namespace, emit, join_room

class ChatNamespace(Namespace):
    """Namespace for chat functionality at /chat"""

    def on_connect(self):
        """Handle connection to /chat namespace"""
        print(f"Client connected to /chat: {request.sid}")

    def on_disconnect(self):
        """Handle disconnection from /chat namespace"""
        print(f"Client disconnected from /chat")

    def on_send_message(self, data):
        """Handle send_message event in /chat namespace"""
        room = data.get('room', 'general')
        emit('new_message', {
            'user': data.get('user'),
            'text': data.get('text')
        }, room=room)

    def on_join(self, data):
        """Handle join event in /chat namespace"""
        room = data.get('room')
        join_room(room)
        emit('joined', {'room': room})

class NotificationNamespace(Namespace):
    """Namespace for notifications at /notifications"""

    def on_connect(self):
        """Client subscribes to notifications"""
        # Add to user-specific room for targeted notifications
        user_id = get_current_user_id()  # Your auth function
        join_room(f'user_{user_id}')

    def on_mark_read(self, data):
        """Mark notification as read"""
        notification_id = data.get('id')
        # Update database
        mark_notification_read(notification_id)
        emit('notification_read', {'id': notification_id})

# Register namespaces with SocketIO instance
socketio.on_namespace(ChatNamespace('/chat'))
socketio.on_namespace(NotificationNamespace('/notifications'))
```

Client connection to specific namespace:

```javascript
// JavaScript client connecting to namespaces
const chatSocket = io('/chat');  // Connect to /chat namespace
const notifySocket = io('/notifications');  // Connect to /notifications namespace

chatSocket.emit('send_message', {user: 'alice', text: 'Hello!'});
notifySocket.on('new_notification', (data) => console.log(data));
```

---

## Authentication with WebSockets

Authenticate WebSocket connections before allowing access. Use connect event handlers to validate tokens or sessions. Return False to reject the connection.

```python
# auth.py
# WebSocket authentication patterns
from flask_socketio import disconnect
from flask import request
from functools import wraps
import jwt

def authenticate_socket(f):
    """Decorator to require authentication for event handlers"""
    @wraps(f)
    def decorated(*args, **kwargs):
        # Check if user is authenticated (stored during connect)
        if not hasattr(request, 'user') or not request.user:
            disconnect()  # Forcefully disconnect unauthenticated client
            return
        return f(*args, **kwargs)
    return decorated

@socketio.on('connect')
def handle_connect():
    """Authenticate connection using token from query string"""
    # Get token from connection query string: io('http://host?token=xxx')
    token = request.args.get('token')

    if not token:
        print("Connection rejected: No token provided")
        return False  # Reject connection

    try:
        # Verify JWT token
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        # Store user info on request for use in other handlers
        request.user = payload
        print(f"Authenticated user: {payload.get('username')}")
        return True  # Accept connection
    except jwt.InvalidTokenError as e:
        print(f"Connection rejected: Invalid token - {e}")
        return False  # Reject connection

@socketio.on('secure_action')
@authenticate_socket
def handle_secure_action(data):
    """Event handler that requires authentication"""
    user = request.user
    print(f"Secure action by {user.get('username')}: {data}")
    emit('action_result', {'status': 'success'})
```

Session-based authentication using Flask-Login:

```python
# session_auth.py
# Session-based WebSocket authentication with Flask-Login
from flask_login import current_user
from flask_socketio import disconnect

@socketio.on('connect')
def handle_connect():
    """Authenticate using Flask-Login session"""
    # current_user is available from Flask-Login
    if not current_user.is_authenticated:
        return False  # Reject unauthenticated connections

    # Join user-specific room for private messages
    join_room(f'user_{current_user.id}')
    print(f"User {current_user.username} connected")
    return True
```

---

## Scaling with Redis Message Queue

For production deployments with multiple server instances, use Redis as a message queue. This ensures events are broadcast to all connected clients across all servers.

```python
# scaled_app.py
# Flask-SocketIO with Redis for horizontal scaling
from flask import Flask
from flask_socketio import SocketIO

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'

# Configure Redis message queue for multi-server deployment
# All server instances must use the same Redis instance
socketio = SocketIO(
    app,
    message_queue='redis://localhost:6379',  # Redis connection URL
    async_mode='eventlet',
    # Optional: specify channel prefix for multiple apps sharing Redis
    channel='flask-socketio'
)

@socketio.on('broadcast_message')
def handle_broadcast(data):
    """Message will be broadcast to clients on ALL server instances"""
    # Redis message queue ensures all servers receive this emit
    socketio.emit('global_message', data, broadcast=True)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
```

Production deployment with Gunicorn:

```bash
# Run with Gunicorn and eventlet workers
# Use multiple workers for handling more connections
gunicorn --worker-class eventlet -w 4 --bind 0.0.0.0:5000 app:app
```

Docker Compose setup with Redis:

```yaml
# docker-compose.yml
# Multi-instance Flask-SocketIO with Redis
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  web:
    build: .
    ports:
      - "5000:5000"
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    deploy:
      replicas: 3  # Run 3 instances for load balancing
```

---

## Error Handling

Handle errors gracefully to prevent crashes and provide feedback to clients. Use try-except blocks and Flask-SocketIO's error handling mechanisms.

```python
# error_handling.py
# Error handling patterns for Flask-SocketIO
from flask_socketio import emit, disconnect
from flask import request
import logging

logger = logging.getLogger(__name__)

@socketio.on_error()
def handle_error(e):
    """Global error handler for the default namespace"""
    logger.error(f"SocketIO error: {e}")
    # Optionally notify the client
    emit('error', {'message': 'An error occurred'})

@socketio.on_error('/chat')
def handle_chat_error(e):
    """Error handler for /chat namespace"""
    logger.error(f"Chat namespace error: {e}")

@socketio.on_error_default
def handle_default_error(e):
    """Catch-all error handler for any namespace"""
    logger.error(f"Unhandled SocketIO error: {e}")
    # Don't expose internal errors to clients
    emit('error', {'message': 'Something went wrong'})

@socketio.on('risky_operation')
def handle_risky_operation(data):
    """Event handler with explicit error handling"""
    try:
        # Validate input
        if not data or 'required_field' not in data:
            emit('error', {'message': 'Missing required_field'})
            return

        # Perform operation that might fail
        result = process_data(data)
        emit('operation_result', {'success': True, 'result': result})

    except ValueError as e:
        # Handle expected errors
        logger.warning(f"Validation error: {e}")
        emit('error', {'message': str(e)})

    except Exception as e:
        # Handle unexpected errors
        logger.exception(f"Unexpected error in risky_operation")
        emit('error', {'message': 'Internal server error'})
        # Optionally disconnect misbehaving clients
        # disconnect()
```

---

## Testing WebSocket Connections

Test Flask-SocketIO applications using the built-in test client. It simulates WebSocket connections without needing a real server.

```python
# test_socketio.py
# Testing Flask-SocketIO applications
import pytest
from flask import Flask
from flask_socketio import SocketIO

# Create test fixtures
@pytest.fixture
def app():
    """Create test Flask application"""
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'test-secret'
    app.config['TESTING'] = True
    return app

@pytest.fixture
def socketio(app):
    """Create SocketIO instance for testing"""
    return SocketIO(app)

@pytest.fixture
def client(app, socketio):
    """Create SocketIO test client"""
    # Register event handlers before creating test client
    @socketio.on('echo')
    def handle_echo(data):
        return data  # Echo back as acknowledgment

    @socketio.on('broadcast_test')
    def handle_broadcast(data):
        socketio.emit('broadcasted', data, broadcast=True)

    # Create test client - no actual server needed
    return socketio.test_client(app)

def test_connection(client):
    """Test client can connect"""
    assert client.is_connected()

def test_echo_event(client):
    """Test event handler with acknowledgment"""
    # Emit event and capture acknowledgment
    ack = client.emit('echo', {'message': 'hello'}, callback=True)
    assert ack == {'message': 'hello'}

def test_broadcast_event(client, app, socketio):
    """Test broadcast to multiple clients"""
    # Create second client
    client2 = socketio.test_client(app)

    # First client broadcasts
    client.emit('broadcast_test', {'data': 'test'})

    # Both clients should receive the broadcast
    received1 = client.get_received()
    received2 = client2.get_received()

    # Find the broadcasted event
    assert any(r['name'] == 'broadcasted' for r in received1)
    assert any(r['name'] == 'broadcasted' for r in received2)

    client2.disconnect()

def test_namespace_connection(app, socketio):
    """Test connection to specific namespace"""
    @socketio.on('connect', namespace='/chat')
    def chat_connect():
        pass

    # Connect to specific namespace
    client = socketio.test_client(app, namespace='/chat')
    assert client.is_connected(namespace='/chat')
    client.disconnect(namespace='/chat')

def test_room_messaging(app, socketio):
    """Test room join and messaging"""
    @socketio.on('join')
    def on_join(data):
        from flask_socketio import join_room, emit
        join_room(data['room'])
        emit('joined', {'room': data['room']}, room=data['room'])

    client1 = socketio.test_client(app)
    client2 = socketio.test_client(app)

    # Both join the same room
    client1.emit('join', {'room': 'test-room'})
    client2.emit('join', {'room': 'test-room'})

    # Check both received the join notification
    received1 = client1.get_received()
    received2 = client2.get_received()

    assert len([r for r in received1 if r['name'] == 'joined']) >= 1
    assert len([r for r in received2 if r['name'] == 'joined']) >= 1
```

---

## Best Practices Summary

1. **Use eventlet or gevent** - Production deployments need async workers, not threading
2. **Authenticate on connect** - Validate tokens or sessions before accepting connections
3. **Implement heartbeats** - Flask-SocketIO handles this automatically with ping_timeout and ping_interval
4. **Use Redis for scaling** - Required when running multiple server instances
5. **Organize with namespaces** - Separate concerns like chat, notifications, and admin
6. **Handle errors gracefully** - Use error handlers to prevent crashes and inform clients
7. **Test with test client** - Use Flask-SocketIO's built-in test client for unit tests
8. **Limit message size** - Validate and limit incoming message sizes to prevent abuse
9. **Use rooms for groups** - More efficient than tracking connections manually
10. **Log connection events** - Track connects, disconnects, and errors for debugging

---

## Conclusion

Flask-SocketIO provides a robust foundation for building real-time applications with Python. Key takeaways:

- **Event-based handlers** make WebSocket logic clean and organized
- **Rooms and namespaces** enable complex messaging patterns
- **Redis message queue** enables horizontal scaling across multiple servers
- **Built-in test client** makes testing straightforward

Start simple with basic events and add rooms, namespaces, and scaling as your application grows.

---

*Need to monitor your WebSocket connections? [OneUptime](https://oneuptime.com) provides real-time monitoring for WebSocket applications.*
