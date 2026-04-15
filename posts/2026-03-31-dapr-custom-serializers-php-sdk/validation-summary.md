# Validation Summary: How to Use Custom Serializers in Dapr PHP SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr PHP SDK (`dapr/php-sdk`)
- PHP 8.x (constructor promotion, named arguments, union types)
- PHP-DI (dependency injection container)

## Sources Consulted
- Dapr PHP SDK source code on GitHub (https://github.com/dapr/php-sdk)
  - `src/lib/Serialization/Serializers/ISerialize.php` — per-type serializer interface
  - `src/lib/Serialization/ISerializer.php` — top-level serializer interface
  - `src/lib/Serialization/SerializationConfig.php` — serializer registration config
  - `src/lib/Deserialization/Deserializers/IDeserialize.php` — per-type deserializer interface
  - `src/lib/Deserialization/DeserializationConfig.php` — deserializer registration config
  - `src/lib/Client/DaprClient.php` — client class and `clientBuilder()` method
  - `src/lib/Client/DaprClientBuilder.php` — builder methods (`withSerializationConfig`, `withDeserializationConfig`)
  - `src/lib/Client/HttpStateTrait.php` — state operation methods (`saveState`, `getState`)
- Dapr PHP SDK `composer.json` and `README.md` for package name confirmation

## Issues Found

1. **Wrong interface namespace**: The post used `\Dapr\Serialization\ISerialize` which does not exist. The correct interface is `\Dapr\Serialization\Serializers\ISerialize` (note the extra `Serializers` namespace segment). Fixed all references throughout the post.

2. **Wrong `serialize()` method signature**: The post had `public function serialize(mixed $data): string`. The actual SDK interface defines `public function serialize(mixed $value, ISerializer $serializer): mixed`. The second parameter allows delegating to the default serializer, and the return type is `mixed`, not `string`. Fixed all serializer implementations.

3. **Missing separate deserialization interface**: The post combined serialization and deserialization into a single `ISerialize` interface with a `deserialize()` method. The Dapr PHP SDK uses two separate interfaces: `\Dapr\Serialization\Serializers\ISerialize` for serialization and `\Dapr\Deserialization\Deserializers\IDeserialize` for deserialization. The deserializer method is `public static function deserialize(mixed $value, IDeserializer $deserializer): mixed` (static). Added a new "Implementing a Custom Deserializer" section with the correct interface.

4. **`withSerializer()` does not exist on `DaprClientBuilder`**: The post used `->withSerializer(new ProductSerializer())`. The actual builder methods are `->withSerializationConfig(SerializationConfig)` and `->withDeserializationConfig(DeserializationConfig)`. Registration is done by adding per-type serializers to config objects. Fixed the registration code.

5. **`trySaveState()` used incorrectly**: The post called `trySaveState('statestore', 'key', $value)` with 3 arguments. The actual `trySaveState()` method requires 4 arguments including a mandatory `string $etag` parameter (for optimistic concurrency control). For simple state saves without etag checking, `saveState()` is the correct method. Changed all calls to `saveState()`.

6. **`tryGetState()` does not exist**: The post used `$client->tryGetState(...)`. This method does not exist in the SDK. The correct method is `getState(string $storeName, string $key, string $asType, ...)` which returns the deserialized value directly. Changed to `getState()`.

7. **`getState()` return value misrepresented**: The post accessed `$state->value` as if `getState()` returns a wrapper object. It actually returns the deserialized value directly. Fixed to use the return value directly.

8. **Wrong PHP-DI registration approach**: The post registered `ISerialize::class => \DI\create(ProductSerializer::class)` in the container. The Dapr PHP SDK expects serializers registered under the `'dapr.serializers.custom'` and `'dapr.deserializers.custom'` container keys as type-to-serializer maps. Fixed the PHP-DI registration code.

9. **Added data class**: Since the SDK uses per-type serializer registration (keyed by class name), a `Product` class was added to make the examples work correctly with the per-type architecture. The original post used plain arrays, which don't have a class name for registration.

## Review Notes
- The `composer require dapr/php-sdk` installation command is correct.
- The `DaprClient::clientBuilder()->build()` pattern is correct.
- The CloudEvent serializer section was simplified to only show the serializer side, since the original combined serialize/deserialize approach was incorrect. A corresponding `OrderEventDeserializer` could be added as a follow-up enhancement.
- The SDK also supports self-serializing objects (classes that implement `ISerialize` directly), which could be mentioned as an alternative approach in future updates.
