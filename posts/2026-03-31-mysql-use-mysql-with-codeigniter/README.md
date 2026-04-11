# How to Use MySQL with CodeIgniter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, CodeIgniter, PHP

Description: Configure MySQL in CodeIgniter 4, use the Query Builder for CRUD operations, manage transactions, and optimize database settings for production.

---

CodeIgniter 4 ships with a built-in database abstraction layer that connects to MySQL out of the box. Its Query Builder provides a fluent interface for building queries without writing raw SQL for most operations.

## Configuring the Database

Edit `app/Config/Database.php`:

```php
public array $default = [
    'DSN'      => '',
    'hostname' => '127.0.0.1',
    'username' => 'ci_user',
    'password' => 'strongpassword',
    'database' => 'ci_db',
    'DBDriver' => 'MySQLi',
    'DBPrefix' => '',
    'pConnect' => false,
    'DBDebug'  => (ENVIRONMENT !== 'production'),
    'charset'  => 'utf8mb4',
    'DBCollat' => 'utf8mb4_general_ci',
    'strictOn' => false,
];
```

Alternatively, use environment variables in `.env`:

```text
database.default.hostname = 127.0.0.1
database.default.database = ci_db
database.default.username = ci_user
database.default.password = strongpassword
database.default.DBDriver = MySQLi
```

## Basic CRUD with Query Builder

```php
// In a Model or Controller
$db = \Config\Database::connect();
$builder = $db->table('products');

// SELECT
$products = $builder->select('id, name, price')
                    ->where('active', 1)
                    ->orderBy('id', 'DESC')
                    ->limit(20)
                    ->get()
                    ->getResultArray();

// INSERT
$builder->insert(['name' => 'Widget', 'price' => 9.99]);

// UPDATE
$builder->where('id', 5)->update(['price' => 12.99]);

// DELETE
$builder->where('id', 5)->delete();
```

## Using CodeIgniter Models

```php
// app/Models/ProductModel.php
namespace App\Models;
use CodeIgniter\Model;

class ProductModel extends Model
{
    protected $table      = 'products';
    protected $primaryKey = 'id';
    protected $allowedFields = ['name', 'price', 'active'];
    protected $useTimestamps = true;
    protected $validationRules = [
        'name'  => 'required|min_length[3]|max_length[200]',
        'price' => 'required|decimal',
    ];
}
```

## Transactions

```php
$db = \Config\Database::connect();

$db->transStart();

$db->table('orders')->insert(['user_id' => 1, 'total' => 99.00]);
$orderId = $db->insertID();
$db->table('order_items')->insert(['order_id' => $orderId, 'product_id' => 3]);

$db->transComplete();

if ($db->transStatus() === false) {
    // transaction was rolled back automatically
    log_message('error', 'Order transaction failed');
}
```

## Running Migrations

```bash
php spark make:migration CreateProductsTable
php spark migrate
```

## Summary

CodeIgniter 4 connects to MySQL through a straightforward configuration in `Database.php` or environment variables. Use the Query Builder for most operations, rely on Model-level validation, and use `transStart/transComplete` for atomic multi-step operations. Always set `charset = utf8mb4` from the start.
