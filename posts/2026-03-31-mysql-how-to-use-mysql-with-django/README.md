# How to Use MySQL with Django

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Django, Python, Database Configuration, Web Development

Description: A complete guide to connecting Django to MySQL, including driver installation, settings configuration, migrations, and common production tips.

---

## Prerequisites

You need Python 3.8+, Django 4.x or 5.x, and a running MySQL 8.0+ instance. You will also need the `mysqlclient` Python package, which is the recommended MySQL adapter for Django.

## Installing the MySQL Driver

```bash
# Install mysqlclient (recommended)
pip install mysqlclient

# Alternative: PyMySQL (pure Python, slower)
pip install PyMySQL
```

If you use PyMySQL, add the following to your `manage.py` and `wsgi.py` before Django imports:

```python
import pymysql
pymysql.install_as_MySQLdb()
```

On Ubuntu/Debian, you may need the development headers first:

```bash
sudo apt-get install python3-dev default-libmysqlclient-dev build-essential
pip install mysqlclient
```

## Configuring Django to Use MySQL

Edit `settings.py` in your Django project:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'myapp_db',
        'USER': 'myapp_user',
        'PASSWORD': 'secretpassword',
        'HOST': '127.0.0.1',
        'PORT': '3306',
        'OPTIONS': {
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
            'charset': 'utf8mb4',
        },
    }
}
```

Using `127.0.0.1` instead of `localhost` forces TCP connection instead of a Unix socket.

## Creating the Database and User

```sql
CREATE DATABASE myapp_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'myapp_user'@'localhost' IDENTIFIED BY 'secretpassword';
GRANT ALL PRIVILEGES ON myapp_db.* TO 'myapp_user'@'localhost';
FLUSH PRIVILEGES;
```

## Running Migrations

```bash
# Verify the connection first
python manage.py dbshell

# Create and apply migrations
python manage.py makemigrations
python manage.py migrate
```

## Using a MySQL Options File for Security

Instead of putting credentials directly in `settings.py`, reference a MySQL options file:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'OPTIONS': {
            'read_default_file': '/etc/mysql/myapp.cnf',
        },
    }
}
```

Contents of `/etc/mysql/myapp.cnf`:

```ini
[client]
database = myapp_db
user = myapp_user
password = secretpassword
host = 127.0.0.1
port = 3306
default-character-set = utf8mb4
```

## Configuring Connection Pooling with CONN_MAX_AGE

By default, Django closes the database connection after each request. Use `CONN_MAX_AGE` to keep connections alive and reduce overhead:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'myapp_db',
        'USER': 'myapp_user',
        'PASSWORD': 'secretpassword',
        'HOST': '127.0.0.1',
        'PORT': '3306',
        'CONN_MAX_AGE': 60,  # Keep connections alive for 60 seconds
    }
}
```

For high-traffic applications, consider using ProxySQL for connection pooling.

## Defining Models with MySQL-Specific Features

Django models map to MySQL tables automatically:

```python
from django.db import models

class Product(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'products'
        indexes = [
            models.Index(fields=['name']),
        ]
```

## Raw MySQL Queries in Django

```python
from django.db import connection

def get_top_customers(limit=10):
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT c.id, c.name, SUM(o.total_amount) AS total
            FROM customers c
            JOIN orders o ON c.id = o.customer_id
            GROUP BY c.id, c.name
            ORDER BY total DESC
            LIMIT %s
        """, [limit])
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]
```

## Handling Transactions

```python
from django.db import transaction

# Atomic block - auto-commits on success, rolls back on exception
with transaction.atomic():
    order = Order.objects.create(customer=customer, total_amount=total)
    for item in cart_items:
        OrderItem.objects.create(order=order, product=item.product, quantity=item.qty)
        item.product.stock -= item.qty
        item.product.save()
```

## Summary

Connecting Django to MySQL requires installing `mysqlclient`, configuring the `DATABASES` setting with the correct engine and credentials, and ensuring the database and user exist with the right privileges. Use `CONN_MAX_AGE` for persistent connections in production, store credentials in a MySQL options file rather than in code, and use `transaction.atomic()` for multi-step write operations that must succeed or fail together.
