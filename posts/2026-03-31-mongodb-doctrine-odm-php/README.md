# How to Use Doctrine MongoDB ODM with PHP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, PHP, Doctrine, ODM, Document

Description: Learn how to use Doctrine MongoDB ODM to map PHP objects to MongoDB documents, perform CRUD operations, and manage relationships with annotations.

---

Doctrine MongoDB ODM (Object Document Mapper) is the PHP counterpart to Doctrine ORM, providing a clean way to map PHP classes to MongoDB documents. It handles serialization, validation, and lifecycle events, letting you work with plain PHP objects instead of raw arrays.

## Installation

```bash
composer require doctrine/mongodb-odm doctrine/mongodb-odm-bundle
```

For standalone PHP (without Symfony):

```bash
composer require doctrine/mongodb-odm
```

## Configuring the Document Manager

Set up the document manager to connect to MongoDB:

```php
<?php
use Doctrine\ODM\MongoDB\Configuration;
use Doctrine\ODM\MongoDB\DocumentManager;
use Doctrine\ODM\MongoDB\Mapping\Driver\AttributeDriver;
use MongoDB\Client;

require_once 'vendor/autoload.php';

$client = new Client('mongodb://localhost:27017');
$config = new Configuration();
$config->setProxyDir('/tmp/proxies');
$config->setHydratorDir('/tmp/hydrators');
$config->setDefaultDB('myapp');
$config->setMetadataDriverImpl(
    AttributeDriver::create(__DIR__ . '/src/Documents')
);

$dm = DocumentManager::create($client, $config);
```

## Defining Document Classes

Use Doctrine annotations (or PHP attributes) to map class properties to MongoDB fields:

```php
<?php
namespace App\Documents;

use Doctrine\ODM\MongoDB\Mapping\Annotations as ODM;

#[ODM\Document(collection: 'products')]
class Product
{
    #[ODM\Id]
    private string $id;

    #[ODM\Field(type: 'string')]
    private string $name;

    #[ODM\Field(type: 'float')]
    private float $price;

    #[ODM\Field(type: 'string')]
    #[ODM\Index(unique: true)]
    private string $sku;

    #[ODM\Field(type: 'bool')]
    private bool $inStock = true;

    // getters and setters
    public function getId(): string { return $this->id; }
    public function getName(): string { return $this->name; }
    public function setName(string $name): void { $this->name = $name; }
    public function getPrice(): float { return $this->price; }
    public function setPrice(float $price): void { $this->price = $price; }
    public function getSku(): string { return $this->sku; }
    public function setSku(string $sku): void { $this->sku = $sku; }
}
```

## CRUD Operations

**Persisting documents:**

```php
<?php
$product = new Product();
$product->setName('Widget');
$product->setPrice(9.99);
$product->setSku('WDG-001');

$dm->persist($product);
$dm->flush();

echo $product->getId(); // MongoDB ObjectId
```

**Querying documents:**

```php
<?php
// Find by ID
$product = $dm->find(Product::class, $id);

// Find all
$products = $dm->getRepository(Product::class)->findAll();

// Find by criteria
$product = $dm->getRepository(Product::class)->findOneBy(['sku' => 'WDG-001']);

// Find multiple
$products = $dm->getRepository(Product::class)->findBy(
    ['inStock' => true],
    ['price' => 'ASC'],
    limit: 10
);
```

**Updating documents:**

```php
<?php
$product = $dm->getRepository(Product::class)->findOneBy(['sku' => 'WDG-001']);
$product->setPrice(12.99);
$dm->flush(); // Only persists dirty fields
```

**Deleting documents:**

```php
<?php
$product = $dm->find(Product::class, $id);
$dm->remove($product);
$dm->flush();
```

## Custom Repository Classes

```php
<?php
namespace App\Repositories;

use Doctrine\ODM\MongoDB\Repository\DocumentRepository;

class ProductRepository extends DocumentRepository
{
    public function findAffordable(float $maxPrice): array
    {
        return $this->createQueryBuilder()
            ->field('price')->lte($maxPrice)
            ->field('inStock')->equals(true)
            ->sort('price', 'ASC')
            ->getQuery()
            ->execute()
            ->toArray();
    }
}
```

Register it on the document class:

```php
#[ODM\Document(collection: 'products', repositoryClass: ProductRepository::class)]
class Product { ... }
```

## Summary

Doctrine MongoDB ODM provides a mature ORM-style interface for PHP MongoDB development. By annotating PHP classes with `#[ODM\Document]` and field-level attributes, you gain automatic mapping between PHP objects and MongoDB documents. The Unit of Work pattern means changes are tracked automatically and flushed in batch, reducing round trips to the database. Custom repository classes keep complex query logic organized and testable.
