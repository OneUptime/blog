# How to Use Custom Serializers in Dapr PHP SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, PHP, Serialization, Custom Serializer, SDK

Description: Learn how to implement and register custom serializers in the Dapr PHP SDK to control how your data objects are serialized and deserialized for state and pub/sub.

---

## Introduction

By default, the Dapr PHP SDK uses JSON serialization for state and pub/sub payloads. Custom serializers let you control exactly how your domain objects are encoded and decoded, which is useful for legacy data formats, performance optimization, or integration with systems that expect specific schemas.

## Prerequisites

```bash
composer require dapr/php-sdk
```

## Default Serialization Behavior

The SDK serializes objects to JSON automatically:

```php
<?php
use Dapr\Client\DaprClient;

$client = DaprClient::clientBuilder()->build();

// This is serialized as {"name":"Widget","price":9.99}
$client->saveState('statestore', 'product-001', [
    'name'  => 'Widget',
    'price' => 9.99
]);
```

## Defining a Data Class

Custom serializers in the Dapr PHP SDK are registered per type. First, define a class for your domain object:

```php
<?php
// src/Product.php
namespace App;

class Product {
    public function __construct(
        public string $sku = '',
        public string $name = '',
        public float $price = 0,
        public int $stock = 0
    ) {}
}
```

## Implementing a Custom Serializer

Create a class that implements `\Dapr\Serialization\Serializers\ISerialize`. The SDK separates serialization and deserialization into distinct interfaces:

```php
<?php
// src/Serializers/ProductSerializer.php
namespace App\Serializers;

use Dapr\Serialization\ISerializer;
use Dapr\Serialization\Serializers\ISerialize;
use App\Product;

class ProductSerializer implements ISerialize {
    public function serialize(mixed $value, ISerializer $serializer): mixed {
        if ($value instanceof Product) {
            // Custom format: pipe-delimited
            return implode('|', [
                $value->sku,
                $value->name,
                (string)$value->price,
                (string)$value->stock
            ]);
        }
        return $serializer->as_json($value);
    }
}
```

## Implementing a Custom Deserializer

Create a class that implements `\Dapr\Deserialization\Deserializers\IDeserialize`:

```php
<?php
// src/Serializers/ProductDeserializer.php
namespace App\Serializers;

use Dapr\Deserialization\IDeserializer;
use Dapr\Deserialization\Deserializers\IDeserialize;
use App\Product;

class ProductDeserializer implements IDeserialize {
    public static function deserialize(mixed $value, IDeserializer $deserializer): mixed {
        if (is_string($value)) {
            $parts = explode('|', $value);
            return new Product(
                sku: $parts[0] ?? '',
                name: $parts[1] ?? '',
                price: (float)($parts[2] ?? 0),
                stock: (int)($parts[3] ?? 0)
            );
        }
        return new Product();
    }
}
```

## Registering the Custom Serializer

Use `SerializationConfig` and `DeserializationConfig` to register per-type serializers with the client builder:

```php
<?php
use Dapr\Client\DaprClient;
use Dapr\Serialization\SerializationConfig;
use Dapr\Deserialization\DeserializationConfig;
use App\Product;
use App\Serializers\ProductSerializer;
use App\Serializers\ProductDeserializer;

$serializationConfig = new SerializationConfig();
$serializationConfig->add(Product::class, new ProductSerializer());

$deserializationConfig = new DeserializationConfig();
$deserializationConfig->add(Product::class, new ProductDeserializer());

$client = DaprClient::clientBuilder()
    ->withSerializationConfig($serializationConfig)
    ->withDeserializationConfig($deserializationConfig)
    ->build();

$product = new Product(
    sku: 'SKU-001',
    name: 'Widget Pro',
    price: 19.99,
    stock: 250
);

$client->saveState('statestore', 'product-SKU-001', $product);
```

## Reading State with Custom Deserialization

```php
<?php
$product = $client->getState(
    storeName: 'statestore',
    key: 'product-SKU-001',
    asType: Product::class
);

echo "Product: {$product->name} - \${$product->price}\n";
echo "Stock: {$product->stock}\n";
```

## Using PHP-DI to Register Serializers

With PHP-DI, register the serializers using the Dapr container keys:

```php
<?php
use DI\ContainerBuilder;
use App\Product;
use App\Serializers\ProductSerializer;
use App\Serializers\ProductDeserializer;

$builder = new ContainerBuilder();
$builder->addDefinitions([
    'dapr.serializers.custom' => [
        Product::class => new ProductSerializer()
    ],
    'dapr.deserializers.custom' => [
        Product::class => new ProductDeserializer()
    ]
]);
$container = $builder->build();
```

## Custom CloudEvent Serializer for Pub/Sub

```php
<?php
namespace App\Serializers;

use Dapr\Serialization\ISerializer;
use Dapr\Serialization\Serializers\ISerialize;

class OrderEventSerializer implements ISerialize {
    public function serialize(mixed $value, ISerializer $serializer): mixed {
        return json_encode([
            'v'  => 1,
            'id' => $value['order_id'],
            'ts' => time(),
            'pl' => $value
        ]);
    }
}
```

## Summary

Custom serializers in the Dapr PHP SDK let you control the wire format of your state and pub/sub payloads. The SDK uses separate interfaces for serialization (`Serializers\ISerialize`) and deserialization (`Deserializers\IDeserialize`), each registered per type via `SerializationConfig` and `DeserializationConfig`. Pass these configs to the client builder with `withSerializationConfig()` and `withDeserializationConfig()`, or register them via PHP-DI using the `dapr.serializers.custom` and `dapr.deserializers.custom` container keys. This is especially useful when integrating with existing systems that require specific data formats or when optimizing for payload size.
