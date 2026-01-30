# How to Implement Custom Descriptors in Python

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Python, Descriptors, OOP, Advanced

Description: Learn how to implement custom descriptors in Python using __get__, __set__, and __delete__ for attribute management.

---

Python descriptors are one of the most powerful yet underutilized features of the language. They form the foundation for properties, methods, static methods, and class methods. Understanding how to implement custom descriptors gives you fine-grained control over attribute access and enables elegant solutions for validation, lazy loading, and caching.

## Understanding the Descriptor Protocol

A descriptor is any object that implements at least one of the following methods: `__get__`, `__set__`, or `__delete__`. When an attribute lookup occurs on an instance, Python checks if the attribute is a descriptor and invokes the appropriate method.

```python
class Descriptor:
    def __get__(self, obj, objtype=None):
        """Called when the attribute is accessed."""
        pass

    def __set__(self, obj, value):
        """Called when the attribute is assigned."""
        pass

    def __delete__(self, obj):
        """Called when the attribute is deleted."""
        pass
```

The `obj` parameter is the instance the descriptor is accessed through, and `objtype` is the class of that instance.

## Data vs Non-Data Descriptors

Python distinguishes between two types of descriptors:

- **Data descriptors**: Implement both `__get__` and `__set__` (or `__delete__`). They take precedence over instance attributes.
- **Non-data descriptors**: Implement only `__get__`. Instance attributes take precedence over non-data descriptors.

This distinction is crucial for understanding attribute lookup order in Python.

## Implementing a Type Validator Descriptor

One common use case is attribute validation. Here is a descriptor that enforces type constraints:

```python
class TypedAttribute:
    def __init__(self, name, expected_type):
        self.name = name
        self.expected_type = expected_type

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__.get(self.name)

    def __set__(self, obj, value):
        if not isinstance(value, self.expected_type):
            raise TypeError(
                f"{self.name} must be {self.expected_type.__name__}, "
                f"got {type(value).__name__}"
            )
        obj.__dict__[self.name] = value

    def __delete__(self, obj):
        del obj.__dict__[self.name]


class Person:
    name = TypedAttribute('name', str)
    age = TypedAttribute('age', int)

    def __init__(self, name, age):
        self.name = name
        self.age = age


person = Person("Alice", 30)
print(person.name)  # Output: Alice

person.age = "thirty"  # Raises TypeError
```

## Creating a Lazy Property Descriptor

Lazy properties compute their value only once, on first access, then cache the result:

```python
class LazyProperty:
    def __init__(self, func):
        self.func = func
        self.name = func.__name__

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        value = self.func(obj)
        setattr(obj, self.name, value)  # Replace descriptor with computed value
        return value


class DataProcessor:
    def __init__(self, data):
        self._data = data

    @LazyProperty
    def processed_data(self):
        print("Computing processed data...")
        return [x * 2 for x in self._data]


processor = DataProcessor([1, 2, 3, 4, 5])
print(processor.processed_data)  # Prints "Computing..." then [2, 4, 6, 8, 10]
print(processor.processed_data)  # Just prints [2, 4, 6, 8, 10], no recomputation
```

## Building a Caching Descriptor with Expiration

For more sophisticated caching, you can implement time-based expiration:

```python
import time

class CachedProperty:
    def __init__(self, func, ttl=60):
        self.func = func
        self.ttl = ttl
        self.cache_key = f"_cache_{func.__name__}"
        self.timestamp_key = f"_timestamp_{func.__name__}"

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self

        now = time.time()
        timestamp = getattr(obj, self.timestamp_key, 0)

        if now - timestamp > self.ttl:
            value = self.func(obj)
            setattr(obj, self.cache_key, value)
            setattr(obj, self.timestamp_key, now)
            return value

        return getattr(obj, self.cache_key)


class APIClient:
    @CachedProperty
    def token(self):
        print("Fetching new token...")
        return "new_auth_token_12345"


client = APIClient()
print(client.token)  # Fetches token
print(client.token)  # Uses cached token
```

## Using __set_name__ for Automatic Naming

Python 3.6 introduced `__set_name__`, which is called when the descriptor is assigned to a class attribute:

```python
class TypedAttribute:
    def __init__(self, expected_type):
        self.expected_type = expected_type

    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__.get(self.name)

    def __set__(self, obj, value):
        if not isinstance(value, self.expected_type):
            raise TypeError(f"{self.name} must be {self.expected_type.__name__}")
        obj.__dict__[self.name] = value


class Product:
    name = TypedAttribute(str)
    price = TypedAttribute(float)
```

This eliminates the need to pass the attribute name explicitly, making the API cleaner.

## Conclusion

Custom descriptors provide a powerful mechanism for controlling attribute access in Python. They enable clean implementations of validation, lazy evaluation, caching, and other cross-cutting concerns. By understanding the descriptor protocol and the distinction between data and non-data descriptors, you can write more elegant and maintainable code. Start with simple use cases like type validation and gradually explore more advanced patterns as your needs grow.
