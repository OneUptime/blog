# How to Implement Weak References in Python

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Python, Memory Management, Performance, Advanced

Description: Master weak references in Python for cache implementations, observer patterns, and preventing memory leaks in long-running applications.

---

Memory management in Python is mostly automatic thanks to reference counting and garbage collection. However, there are situations where you need finer control over object lifetimes. This is where weak references come in. They allow you to reference an object without preventing it from being garbage collected.

In this guide, we will explore the `weakref` module, learn how to implement various weak reference patterns, and understand when and why to use them.

## What Are Weak References?

A regular (strong) reference to an object keeps that object alive. As long as at least one strong reference exists, the object will not be garbage collected. A weak reference, on the other hand, does not prevent garbage collection.

Here is a comparison between strong and weak references:

| Aspect | Strong Reference | Weak Reference |
|--------|------------------|----------------|
| Keeps object alive | Yes | No |
| Access method | Direct | Call the reference or use `.ref()` |
| Returns when dead | N/A | `None` |
| Common use cases | Normal variables | Caches, callbacks, observers |
| Memory impact | Prevents GC | Allows GC |

## Getting Started with the weakref Module

The `weakref` module is part of Python's standard library. Let's start with the basics.

### Creating a Basic Weak Reference

The following example demonstrates how to create a weak reference to an object and access it.

```python
import weakref

class ExpensiveObject:
    """A class representing some expensive resource."""

    def __init__(self, name):
        self.name = name
        print(f"Created: {self.name}")

    def __del__(self):
        print(f"Destroyed: {self.name}")

    def process(self):
        return f"Processing {self.name}"


# Create an object and a weak reference to it
obj = ExpensiveObject("Resource-A")
weak_ref = weakref.ref(obj)

# Access the object through the weak reference by calling it
print(f"Weak ref alive: {weak_ref()}")  # Returns the object
print(f"Processing: {weak_ref().process()}")

# Delete the strong reference
del obj

# The weak reference now returns None
print(f"Weak ref after deletion: {weak_ref()}")
```

Output:
```
Created: Resource-A
Weak ref alive: <__main__.ExpensiveObject object at 0x...>
Processing: Processing Resource-A
Destroyed: Resource-A
Weak ref after deletion: None
```

### Adding a Callback on Object Death

You can register a callback function that gets called when the referenced object is about to be finalized.

```python
import weakref

class DataProcessor:
    def __init__(self, processor_id):
        self.processor_id = processor_id
        print(f"Processor {processor_id} initialized")

    def __del__(self):
        print(f"Processor {self.processor_id} destroyed")


def cleanup_callback(weak_reference):
    """Called when the referenced object is garbage collected."""
    print(f"Callback triggered - object is being collected")


# Create object with weak reference and callback
processor = DataProcessor("PROC-001")
weak_processor = weakref.ref(processor, cleanup_callback)

print(f"Processor active: {weak_processor() is not None}")

# Remove strong reference
del processor

print(f"Processor active after del: {weak_processor() is not None}")
```

Output:
```
Processor PROC-001 initialized
Processor active: True
Callback triggered - object is being collected
Processor PROC-001 destroyed
Processor active after del: False
```

## WeakValueDictionary: Building Memory-Efficient Caches

`WeakValueDictionary` stores weak references to its values. When a value is garbage collected, its entry is automatically removed from the dictionary.

### Implementing a Simple Cache

This pattern is useful for caching expensive objects that should be garbage collected when no longer needed elsewhere.

```python
import weakref


class DatabaseConnection:
    """Simulates an expensive database connection."""

    _connection_count = 0

    def __init__(self, connection_string):
        self.connection_string = connection_string
        DatabaseConnection._connection_count += 1
        self.conn_id = DatabaseConnection._connection_count
        print(f"Opening connection {self.conn_id} to {connection_string}")

    def __del__(self):
        print(f"Closing connection {self.conn_id}")

    def query(self, sql):
        return f"[Conn {self.conn_id}] Executing: {sql}"


class ConnectionCache:
    """A cache that holds weak references to connections."""

    def __init__(self):
        self._cache = weakref.WeakValueDictionary()

    def get_connection(self, connection_string):
        """Get a cached connection or create a new one."""
        conn = self._cache.get(connection_string)
        if conn is not None:
            print(f"Cache hit for {connection_string}")
            return conn

        print(f"Cache miss for {connection_string}")
        conn = DatabaseConnection(connection_string)
        self._cache[connection_string] = conn
        return conn

    def cache_size(self):
        return len(self._cache)


# Demonstration
cache = ConnectionCache()

# First request - creates new connection
conn1 = cache.get_connection("postgres://localhost/db1")
print(f"Cache size: {cache.cache_size()}")

# Second request - returns cached connection
conn2 = cache.get_connection("postgres://localhost/db1")
print(f"Same connection: {conn1 is conn2}")

# Different connection string - creates new connection
conn3 = cache.get_connection("postgres://localhost/db2")
print(f"Cache size: {cache.cache_size()}")

# Delete one connection reference
del conn1
del conn2
print(f"Cache size after del: {cache.cache_size()}")

# Force garbage collection to clean up
import gc
gc.collect()
print(f"Cache size after gc: {cache.cache_size()}")
```

### Comparison: Regular Dict vs WeakValueDictionary

| Feature | Regular Dict | WeakValueDictionary |
|---------|--------------|---------------------|
| Keeps values alive | Yes | No |
| Auto-removes dead entries | No | Yes |
| Memory usage | Higher | Lower |
| Suitable for caches | With manual cleanup | Yes |
| Thread-safe | No | No |

## WeakKeyDictionary: Attaching Metadata to Objects

`WeakKeyDictionary` holds weak references to its keys. When a key object is garbage collected, the corresponding entry is removed.

### Adding Metadata Without Modifying Objects

This is useful when you want to associate extra data with objects without modifying their classes.

```python
import weakref


class Widget:
    """A third-party class we cannot modify."""

    def __init__(self, widget_id):
        self.widget_id = widget_id

    def __repr__(self):
        return f"Widget({self.widget_id})"


class WidgetMetadataStore:
    """Store metadata for widgets without modifying the Widget class."""

    def __init__(self):
        self._metadata = weakref.WeakKeyDictionary()

    def set_metadata(self, widget, **kwargs):
        """Attach metadata to a widget."""
        if widget not in self._metadata:
            self._metadata[widget] = {}
        self._metadata[widget].update(kwargs)

    def get_metadata(self, widget, key, default=None):
        """Retrieve metadata from a widget."""
        if widget in self._metadata:
            return self._metadata[widget].get(key, default)
        return default

    def get_all_metadata(self, widget):
        """Get all metadata for a widget."""
        return self._metadata.get(widget, {})

    def tracked_count(self):
        """How many widgets are being tracked."""
        return len(self._metadata)


# Usage example
store = WidgetMetadataStore()

widget1 = Widget("btn-submit")
widget2 = Widget("txt-username")

# Attach metadata
store.set_metadata(widget1, created_at="2024-01-15", author="alice")
store.set_metadata(widget2, created_at="2024-01-16", author="bob", priority=1)

print(f"Widget1 author: {store.get_metadata(widget1, 'author')}")
print(f"Widget2 metadata: {store.get_all_metadata(widget2)}")
print(f"Tracked widgets: {store.tracked_count()}")

# Delete a widget - metadata is automatically cleaned up
del widget1
import gc
gc.collect()

print(f"Tracked widgets after del: {store.tracked_count()}")
```

Output:
```
Widget1 author: alice
Widget2 metadata: {'created_at': '2024-01-16', 'author': 'bob', 'priority': 1}
Tracked widgets: 2
Tracked widgets after del: 1
```

## Using weakref.finalize for Cleanup Actions

`weakref.finalize` provides a more robust way to register cleanup actions than `__del__` methods.

### Why finalize is Better Than __del__

| Aspect | __del__ | weakref.finalize |
|--------|---------|------------------|
| Guaranteed to run | No | Yes (if registered) |
| Can access dead object | Tries to | No (by design) |
| Order of execution | Undefined | Can be controlled |
| Can be called manually | No | Yes with atexit=False |
| Survives reference cycles | Maybe | Yes |

### Implementing Resource Cleanup

The following example shows how to properly clean up external resources using finalize.

```python
import weakref
import tempfile
import os


class TempFileHandler:
    """Manages a temporary file with guaranteed cleanup."""

    def __init__(self, prefix="temp_"):
        # Create actual temp file
        self._fd, self._path = tempfile.mkstemp(prefix=prefix)
        print(f"Created temp file: {self._path}")

        # Register finalizer for cleanup
        # Note: we pass the path, not self, to avoid preventing GC
        self._finalizer = weakref.finalize(
            self,
            self._cleanup,
            self._path,
            self._fd
        )

    @staticmethod
    def _cleanup(path, fd):
        """Static method to clean up resources."""
        print(f"Finalizer cleaning up: {path}")
        try:
            os.close(fd)
            os.unlink(path)
            print(f"Successfully removed: {path}")
        except OSError as e:
            print(f"Cleanup error: {e}")

    def write(self, data):
        """Write data to the temp file."""
        os.write(self._fd, data.encode())

    def cleanup_now(self):
        """Manually trigger cleanup."""
        self._finalizer()

    @property
    def is_alive(self):
        """Check if the file still exists."""
        return self._finalizer.alive


# Example usage
handler = TempFileHandler(prefix="myapp_")
handler.write("Hello, World!")
print(f"File alive: {handler.is_alive}")

# Cleanup happens automatically when handler is garbage collected
del handler
import gc
gc.collect()
```

## Practical Use Case: Observer Pattern with Weak References

The observer pattern often suffers from memory leaks because the subject holds strong references to observers. Using weak references solves this problem.

```python
import weakref
from typing import Callable, Any


class Event:
    """An event that observers can subscribe to."""

    def __init__(self, name):
        self.name = name
        self._observers = []

    def subscribe(self, callback):
        """Subscribe to this event with a weak reference."""
        # Store weak reference to bound methods or functions
        if hasattr(callback, '__self__'):
            # It's a bound method - need special handling
            ref = weakref.WeakMethod(callback, self._remove_dead_ref)
        else:
            # It's a function
            ref = weakref.ref(callback, self._remove_dead_ref)

        self._observers.append(ref)
        print(f"Subscribed to {self.name}, total observers: {len(self._observers)}")

    def _remove_dead_ref(self, ref):
        """Callback to remove dead references."""
        if ref in self._observers:
            self._observers.remove(ref)
            print(f"Removed dead observer from {self.name}")

    def emit(self, *args, **kwargs):
        """Notify all observers."""
        dead_refs = []
        for ref in self._observers:
            callback = ref()
            if callback is not None:
                callback(*args, **kwargs)
            else:
                dead_refs.append(ref)

        # Clean up any dead references
        for ref in dead_refs:
            self._observers.remove(ref)

    @property
    def observer_count(self):
        return len(self._observers)


class DataModel:
    """A model that emits events when data changes."""

    def __init__(self):
        self.on_change = Event("on_change")
        self._data = {}

    def set(self, key, value):
        old_value = self._data.get(key)
        self._data[key] = value
        self.on_change.emit(key, old_value, value)

    def get(self, key, default=None):
        return self._data.get(key, default)


class DataView:
    """A view that observes a model."""

    def __init__(self, name, model):
        self.name = name
        # Subscribe to model changes
        model.on_change.subscribe(self.on_data_changed)

    def on_data_changed(self, key, old_value, new_value):
        print(f"[{self.name}] {key}: {old_value} -> {new_value}")


# Demonstration
model = DataModel()

# Create views that observe the model
view1 = DataView("View1", model)
view2 = DataView("View2", model)

print(f"Observers: {model.on_change.observer_count}")

# Make changes - both views are notified
model.set("username", "alice")

# Delete one view - it should be automatically unsubscribed
del view1
import gc
gc.collect()

print(f"Observers after del: {model.on_change.observer_count}")

# Only view2 receives this update
model.set("username", "bob")
```

Output:
```
Subscribed to on_change, total observers: 1
Subscribed to on_change, total observers: 2
Observers: 2
[View1] username: None -> alice
[View2] username: None -> alice
Removed dead observer from on_change
Observers after del: 1
[View2] username: alice -> bob
```

## Handling Parent-Child Relationships

Circular references between parent and child objects can prevent garbage collection. Weak references break these cycles.

```python
import weakref


class TreeNode:
    """A tree node that avoids circular reference memory leaks."""

    def __init__(self, value, parent=None):
        self.value = value
        self.children = []
        # Store weak reference to parent to avoid circular reference
        self._parent_ref = weakref.ref(parent) if parent else None

        if parent:
            parent.children.append(self)

    @property
    def parent(self):
        """Get the parent node, or None if it has been garbage collected."""
        if self._parent_ref is None:
            return None
        return self._parent_ref()

    def add_child(self, value):
        """Create and add a child node."""
        return TreeNode(value, parent=self)

    def __repr__(self):
        parent_val = self.parent.value if self.parent else None
        return f"TreeNode({self.value}, parent={parent_val})"

    def path_to_root(self):
        """Get the path from this node to the root."""
        path = [self.value]
        current = self.parent
        while current is not None:
            path.append(current.value)
            current = current.parent
        return list(reversed(path))


# Build a tree
root = TreeNode("root")
child1 = root.add_child("child1")
child2 = root.add_child("child2")
grandchild1 = child1.add_child("grandchild1")
grandchild2 = child1.add_child("grandchild2")

print(f"Grandchild1: {grandchild1}")
print(f"Path to root: {grandchild1.path_to_root()}")

# If we delete the root, children can still exist but lose their parent reference
del root
import gc
gc.collect()

print(f"Child1 parent after root deleted: {child1.parent}")
print(f"Grandchild still has path via child1: {grandchild1.parent}")
```

## WeakSet: Tracking Objects Without Preventing Collection

`WeakSet` is like a regular set but holds weak references to its elements.

```python
import weakref


class ActiveSession:
    """Represents an active user session."""

    _active_sessions = weakref.WeakSet()

    def __init__(self, user_id):
        self.user_id = user_id
        ActiveSession._active_sessions.add(self)
        print(f"Session started for {user_id}")

    def __del__(self):
        print(f"Session ended for {self.user_id}")

    @classmethod
    def get_active_count(cls):
        return len(cls._active_sessions)

    @classmethod
    def get_active_users(cls):
        return [s.user_id for s in cls._active_sessions]


# Create some sessions
session1 = ActiveSession("user-001")
session2 = ActiveSession("user-002")
session3 = ActiveSession("user-003")

print(f"Active sessions: {ActiveSession.get_active_count()}")
print(f"Active users: {ActiveSession.get_active_users()}")

# End some sessions
del session1
del session2
import gc
gc.collect()

print(f"Active sessions after cleanup: {ActiveSession.get_active_count()}")
print(f"Active users: {ActiveSession.get_active_users()}")
```

Output:
```
Session started for user-001
Session started for user-002
Session started for user-003
Active sessions: 3
Active users: ['user-001', 'user-002', 'user-003']
Session ended for user-001
Session ended for user-002
Active sessions after cleanup: 1
Active users: ['user-003']
```

## Limitations and Gotchas

### Objects That Cannot Have Weak References

Not all objects support weak references. Built-in types like `int`, `str`, `list`, `dict`, and `tuple` do not support them.

```python
import weakref

# These will raise TypeError
try:
    ref = weakref.ref(42)
except TypeError as e:
    print(f"int: {e}")

try:
    ref = weakref.ref("hello")
except TypeError as e:
    print(f"str: {e}")

try:
    ref = weakref.ref([1, 2, 3])
except TypeError as e:
    print(f"list: {e}")

# Custom classes work by default
class MyClass:
    pass

ref = weakref.ref(MyClass())
print(f"Custom class: works")

# To enable weak references on a class with __slots__, include __weakref__
class SlottedClass:
    __slots__ = ['value', '__weakref__']

    def __init__(self, value):
        self.value = value

ref = weakref.ref(SlottedClass(10))
print(f"Slotted class with __weakref__: works")
```

### Common Pitfalls

Here are mistakes to avoid when working with weak references.

```python
import weakref


# Pitfall 1: Creating weak reference to temporary object
def bad_example():
    # The object is garbage collected immediately
    ref = weakref.ref(SomeClass())  # Object dies right away
    return ref()  # Always None


# Pitfall 2: Forgetting to check if reference is alive
class SomeClass:
    def process(self):
        return "processed"

obj = SomeClass()
ref = weakref.ref(obj)

# Bad - can raise AttributeError if obj is collected
# result = ref().process()

# Good - always check first
target = ref()
if target is not None:
    result = target.process()
else:
    result = None


# Pitfall 3: Storing the result of ref() without checking
obj2 = SomeClass()
ref2 = weakref.ref(obj2)

# Bad - race condition between check and use
if ref2() is not None:
    # Object could be collected here before next line
    ref2().process()  # Might fail

# Good - store reference and check once
target2 = ref2()
if target2 is not None:
    target2.process()  # Safe - target2 is a strong reference


# Pitfall 4: Weak references to bound methods require WeakMethod
class Handler:
    def handle(self, data):
        print(f"Handling: {data}")

handler = Handler()

# Bad - regular ref does not work with bound methods
try:
    ref = weakref.ref(handler.handle)
except TypeError as e:
    print(f"Regular ref to bound method: {e}")

# Good - use WeakMethod for bound methods
method_ref = weakref.WeakMethod(handler.handle)
callback = method_ref()
if callback:
    callback("test data")
```

### Performance Considerations

| Operation | Regular Reference | Weak Reference |
|-----------|-------------------|----------------|
| Creation | Fast | Slightly slower |
| Access | Direct | Function call |
| Memory overhead | None | Small per reference |
| GC interaction | None | Callback overhead |

For most applications, the overhead is negligible. However, avoid using weak references in tight loops where you access the same object thousands of times per second.

## Summary

Weak references are a powerful tool for specific scenarios:

1. **Caches**: Use `WeakValueDictionary` to cache expensive objects that can be reclaimed when memory is needed.

2. **Observer Pattern**: Use `weakref.ref` or `WeakMethod` to prevent observers from keeping subjects alive.

3. **Parent-Child Relationships**: Store parent references as weak references to avoid circular reference memory leaks.

4. **Metadata Storage**: Use `WeakKeyDictionary` to attach data to objects without modifying them.

5. **Cleanup Actions**: Use `weakref.finalize` for reliable resource cleanup.

Remember these key points:

- Always check if a weak reference is still alive before using it
- Store the dereferenced object in a local variable to prevent race conditions
- Use `WeakMethod` for bound methods
- Some built-in types do not support weak references
- Include `__weakref__` in `__slots__` if your class uses slots

Weak references are not needed for every application, but when you need them, they are the right solution for managing object lifetimes without creating memory leaks.
