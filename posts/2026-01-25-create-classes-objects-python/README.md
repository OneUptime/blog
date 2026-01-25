# How to Create Classes and Objects in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, OOP, Classes, Objects, Object-Oriented Programming

Description: Learn how to create classes and objects in Python. This guide covers class definition, initialization, methods, inheritance, and best practices for object-oriented programming.

---

Object-oriented programming (OOP) lets you organize code into reusable, logical structures. Python makes OOP straightforward with its clean class syntax. This guide covers everything you need to know about creating and using classes in Python.

## Basic Class Definition

A class is a blueprint for creating objects. The simplest class looks like this:

```python
class Dog:
    """A simple Dog class."""
    pass

# Create an instance (object)
my_dog = Dog()
print(type(my_dog))  # <class '__main__.Dog'>
```

## The __init__ Method

The `__init__` method initializes new objects. It runs automatically when you create an instance:

```python
class Dog:
    """A Dog with a name and age."""

    def __init__(self, name, age):
        # self refers to the instance being created
        self.name = name
        self.age = age

# Create instances
buddy = Dog("Buddy", 3)
max_dog = Dog("Max", 5)

print(buddy.name)  # Buddy
print(max_dog.age)  # 5
```

## Instance Methods

Methods are functions defined inside a class. They always take `self` as the first parameter:

```python
class Dog:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def bark(self):
        """Make the dog bark."""
        return f"{self.name} says Woof!"

    def get_human_years(self):
        """Convert dog years to human years."""
        return self.age * 7

    def have_birthday(self):
        """Increment the dog's age."""
        self.age += 1
        return f"Happy birthday {self.name}! Now {self.age} years old."

buddy = Dog("Buddy", 3)
print(buddy.bark())  # Buddy says Woof!
print(buddy.get_human_years())  # 21
print(buddy.have_birthday())  # Happy birthday Buddy! Now 4 years old.
```

## Class Attributes vs Instance Attributes

Class attributes are shared by all instances. Instance attributes are unique to each object:

```python
class Dog:
    # Class attribute - shared by all instances
    species = "Canis familiaris"

    def __init__(self, name, age):
        # Instance attributes - unique to each instance
        self.name = name
        self.age = age

buddy = Dog("Buddy", 3)
max_dog = Dog("Max", 5)

# Both share the class attribute
print(buddy.species)   # Canis familiaris
print(max_dog.species)  # Canis familiaris

# Each has unique instance attributes
print(buddy.name)  # Buddy
print(max_dog.name)  # Max
```

## Class Methods and Static Methods

```python
class Dog:
    species = "Canis familiaris"
    _count = 0  # Track number of dogs created

    def __init__(self, name, age):
        self.name = name
        self.age = age
        Dog._count += 1

    # Class method - receives class as first argument
    @classmethod
    def get_count(cls):
        """Return total number of dogs created."""
        return cls._count

    @classmethod
    def create_puppy(cls, name):
        """Factory method to create a puppy."""
        return cls(name, 0)

    # Static method - no automatic first argument
    @staticmethod
    def is_valid_age(age):
        """Check if age is valid for a dog."""
        return 0 <= age <= 30

# Using class method
dog1 = Dog("Buddy", 3)
dog2 = Dog("Max", 5)
print(Dog.get_count())  # 2

# Using factory method
puppy = Dog.create_puppy("Spot")
print(puppy.age)  # 0

# Using static method
print(Dog.is_valid_age(5))   # True
print(Dog.is_valid_age(-1))  # False
```

## Properties

Properties let you define methods that behave like attributes:

```python
class Circle:
    def __init__(self, radius):
        self._radius = radius  # Private by convention

    @property
    def radius(self):
        """Get the radius."""
        return self._radius

    @radius.setter
    def radius(self, value):
        """Set the radius with validation."""
        if value < 0:
            raise ValueError("Radius cannot be negative")
        self._radius = value

    @property
    def area(self):
        """Calculate area (read-only property)."""
        import math
        return math.pi * self._radius ** 2

    @property
    def diameter(self):
        """Calculate diameter."""
        return self._radius * 2

circle = Circle(5)
print(circle.radius)   # 5
print(circle.area)     # 78.54...
print(circle.diameter)  # 10

circle.radius = 10  # Uses setter
print(circle.area)  # 314.15...

# circle.radius = -5  # Raises ValueError
```

## Inheritance

Inheritance lets you create specialized versions of classes:

```python
class Animal:
    """Base class for animals."""

    def __init__(self, name):
        self.name = name

    def speak(self):
        raise NotImplementedError("Subclasses must implement speak()")

    def __str__(self):
        return f"{self.__class__.__name__}: {self.name}"

class Dog(Animal):
    """Dog is a type of Animal."""

    def __init__(self, name, breed):
        super().__init__(name)  # Call parent's __init__
        self.breed = breed

    def speak(self):
        return f"{self.name} says Woof!"

class Cat(Animal):
    """Cat is a type of Animal."""

    def speak(self):
        return f"{self.name} says Meow!"

# Using inheritance
dog = Dog("Buddy", "Golden Retriever")
cat = Cat("Whiskers")

print(dog.speak())  # Buddy says Woof!
print(cat.speak())  # Whiskers says Meow!
print(str(dog))     # Dog: Buddy

# Check inheritance
print(isinstance(dog, Animal))  # True
print(isinstance(dog, Dog))     # True
print(issubclass(Dog, Animal))  # True
```

## Special Methods (Dunder Methods)

Special methods customize how objects behave with Python operators and functions:

```python
class Vector:
    """A 2D vector with operator overloading."""

    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        """Developer-friendly string representation."""
        return f"Vector({self.x}, {self.y})"

    def __str__(self):
        """User-friendly string representation."""
        return f"({self.x}, {self.y})"

    def __add__(self, other):
        """Add two vectors using + operator."""
        return Vector(self.x + other.x, self.y + other.y)

    def __sub__(self, other):
        """Subtract vectors using - operator."""
        return Vector(self.x - other.x, self.y - other.y)

    def __mul__(self, scalar):
        """Multiply by scalar using * operator."""
        return Vector(self.x * scalar, self.y * scalar)

    def __eq__(self, other):
        """Check equality using == operator."""
        return self.x == other.x and self.y == other.y

    def __len__(self):
        """Return magnitude as integer for len()."""
        import math
        return int(math.sqrt(self.x**2 + self.y**2))

    def __bool__(self):
        """Return False if zero vector."""
        return self.x != 0 or self.y != 0

v1 = Vector(3, 4)
v2 = Vector(1, 2)

print(v1 + v2)      # (4, 6)
print(v1 - v2)      # (2, 2)
print(v1 * 2)       # (6, 8)
print(v1 == v2)     # False
print(len(v1))      # 5
print(bool(Vector(0, 0)))  # False
```

## Data Classes (Python 3.7+)

Data classes reduce boilerplate for simple classes that mainly hold data:

```python
from dataclasses import dataclass, field

@dataclass
class Person:
    name: str
    age: int
    email: str = ""  # Default value

# Automatically generates __init__, __repr__, __eq__
alice = Person("Alice", 30, "alice@example.com")
bob = Person("Bob", 25)

print(alice)  # Person(name='Alice', age=30, email='alice@example.com')
print(alice == Person("Alice", 30, "alice@example.com"))  # True

# More complex data class
@dataclass
class Order:
    order_id: str
    items: list = field(default_factory=list)  # Mutable default
    total: float = 0.0

    def add_item(self, item, price):
        self.items.append(item)
        self.total += price

order = Order("ORD-001")
order.add_item("Widget", 9.99)
print(order)  # Order(order_id='ORD-001', items=['Widget'], total=9.99)
```

## Real World Example: Bank Account System

```python
from datetime import datetime
from dataclasses import dataclass, field

@dataclass
class Transaction:
    """A single transaction record."""
    type: str
    amount: float
    timestamp: datetime = field(default_factory=datetime.now)
    description: str = ""

class BankAccount:
    """A bank account with transaction history."""

    def __init__(self, account_number, owner, initial_balance=0):
        self.account_number = account_number
        self.owner = owner
        self._balance = initial_balance
        self._transactions = []

        if initial_balance > 0:
            self._record_transaction("deposit", initial_balance, "Initial deposit")

    @property
    def balance(self):
        """Get current balance (read-only)."""
        return self._balance

    def deposit(self, amount, description=""):
        """Deposit money into account."""
        if amount <= 0:
            raise ValueError("Deposit amount must be positive")

        self._balance += amount
        self._record_transaction("deposit", amount, description)
        return self._balance

    def withdraw(self, amount, description=""):
        """Withdraw money from account."""
        if amount <= 0:
            raise ValueError("Withdrawal amount must be positive")
        if amount > self._balance:
            raise ValueError("Insufficient funds")

        self._balance -= amount
        self._record_transaction("withdrawal", amount, description)
        return self._balance

    def _record_transaction(self, type, amount, description):
        """Record a transaction in history."""
        transaction = Transaction(type, amount, description=description)
        self._transactions.append(transaction)

    def get_statement(self):
        """Get account statement."""
        lines = [
            f"Account: {self.account_number}",
            f"Owner: {self.owner}",
            f"Balance: ${self._balance:.2f}",
            "",
            "Recent Transactions:",
        ]
        for t in self._transactions[-5:]:
            lines.append(
                f"  {t.timestamp:%Y-%m-%d %H:%M} | "
                f"{t.type:10} | ${t.amount:8.2f} | {t.description}"
            )
        return "\n".join(lines)

    def __repr__(self):
        return f"BankAccount({self.account_number}, {self.owner}, balance={self._balance})"

# Using the bank account
account = BankAccount("ACC-001", "Alice", 1000)
account.deposit(500, "Paycheck")
account.withdraw(200, "Groceries")
print(account.get_statement())
```

## Summary

| Concept | Purpose |
|---------|---------|
| `__init__` | Initialize object state |
| `self` | Reference to current instance |
| Instance attributes | Data unique to each object |
| Class attributes | Data shared by all instances |
| `@classmethod` | Method that receives class |
| `@staticmethod` | Method without automatic arguments |
| `@property` | Method that behaves like attribute |
| Inheritance | Create specialized classes |
| Special methods | Customize object behavior |
| `@dataclass` | Reduce boilerplate for data classes |

Python classes are flexible and powerful. Start simple, and add complexity only when needed. The goal is readable, maintainable code.
