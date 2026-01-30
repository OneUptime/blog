# How to Create Memory-Efficient Classes with __slots__

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Python, Memory, Performance, OOP

Description: Learn how to use __slots__ in Python classes to reduce memory usage and improve attribute access speed.

---

When building Python applications that create thousands or millions of objects, memory consumption can become a significant concern. Python's `__slots__` mechanism offers an elegant solution to reduce memory overhead while also providing faster attribute access. This guide explores how to effectively use `__slots__` to create memory-efficient classes.

## What __slots__ Does

By default, Python stores instance attributes in a dictionary called `__dict__`. While flexible, this approach consumes extra memory for each object. When you define `__slots__`, Python uses a more compact internal representation instead of a dictionary.

```python
# Standard class with __dict__
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

# Memory-efficient class with __slots__
class SlottedPoint:
    __slots__ = ['x', 'y']

    def __init__(self, x, y):
        self.x = x
        self.y = y
```

With `__slots__`, Python allocates a fixed amount of space for the specified attributes, eliminating the per-instance dictionary overhead.

## Memory Savings Comparison

The memory savings with `__slots__` can be substantial, especially when creating many instances.

```python
import sys

class RegularPerson:
    def __init__(self, name, age, email):
        self.name = name
        self.age = age
        self.email = email

class SlottedPerson:
    __slots__ = ['name', 'age', 'email']

    def __init__(self, name, age, email):
        self.name = name
        self.age = age
        self.email = email

# Compare memory usage
regular = RegularPerson("Alice", 30, "alice@example.com")
slotted = SlottedPerson("Alice", 30, "alice@example.com")

print(f"Regular class: {sys.getsizeof(regular) + sys.getsizeof(regular.__dict__)} bytes")
print(f"Slotted class: {sys.getsizeof(slotted)} bytes")
```

In practice, slotted classes typically use 40-50% less memory per instance. For applications creating millions of objects, this translates to gigabytes of saved memory.

## When to Use Slots

`__slots__` is ideal in these scenarios:

- **High-volume object creation**: Data processing pipelines, scientific computing, or game development where millions of objects exist simultaneously
- **Fixed attribute sets**: Classes where the attributes are known in advance and won't change
- **Performance-critical code**: When faster attribute access matters

Avoid `__slots__` when:

- You need dynamic attribute assignment
- You're using multiple inheritance extensively
- The class has very few instances

```python
# Good use case: Many instances with fixed attributes
class Particle:
    __slots__ = ['x', 'y', 'z', 'velocity', 'mass']

    def __init__(self, x, y, z, velocity, mass):
        self.x = x
        self.y = y
        self.z = z
        self.velocity = velocity
        self.mass = mass

# Creating millions of particles now uses significantly less memory
particles = [Particle(i, i, i, 1.0, 0.1) for i in range(1000000)]
```

## Inheritance with Slots

When using inheritance with `__slots__`, each class in the hierarchy should only declare its own attributes.

```python
class Vehicle:
    __slots__ = ['brand', 'model']

    def __init__(self, brand, model):
        self.brand = brand
        self.model = model

class Car(Vehicle):
    __slots__ = ['num_doors', 'fuel_type']  # Only new attributes

    def __init__(self, brand, model, num_doors, fuel_type):
        super().__init__(brand, model)
        self.num_doors = num_doors
        self.fuel_type = fuel_type

car = Car("Toyota", "Camry", 4, "hybrid")
```

Important: If a parent class doesn't use `__slots__`, the child class will still have a `__dict__`, negating the memory benefits.

## Slots and Weakrefs

By default, slotted classes don't support weak references. To enable them, include `__weakref__` in your slots.

```python
import weakref

class CacheableItem:
    __slots__ = ['key', 'value', '__weakref__']

    def __init__(self, key, value):
        self.key = key
        self.value = value

item = CacheableItem("user_1", {"name": "Alice"})
weak_ref = weakref.ref(item)  # Now works!
```

## Slots with Dataclasses

Python 3.10+ introduced native `__slots__` support in dataclasses, making memory-efficient data structures even easier to create.

```python
from dataclasses import dataclass

@dataclass(slots=True)
class Coordinate:
    x: float
    y: float
    z: float

# Automatically uses __slots__ with all the dataclass conveniences
point = Coordinate(1.0, 2.0, 3.0)
print(point)  # Coordinate(x=1.0, y=2.0, z=3.0)
```

This combines the memory efficiency of `__slots__` with dataclass features like automatic `__init__`, `__repr__`, and comparison methods.

## Conclusion

`__slots__` is a powerful optimization tool for Python classes that need to be memory-efficient. By understanding when and how to use it, you can significantly reduce memory consumption in applications that create many objects. Remember to consider the trade-offs: while you gain memory efficiency and slightly faster attribute access, you lose the flexibility of dynamic attribute assignment. For data-heavy applications, the benefits often far outweigh the limitations.
