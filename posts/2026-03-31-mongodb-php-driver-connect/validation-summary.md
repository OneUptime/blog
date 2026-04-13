# Validation Summary: How to Connect to MongoDB from PHP Using the PHP Driver

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- PHP
- ext-mongodb (PECL C extension)
- mongodb/mongodb (Composer PHP library)
- Composer
- Laravel (brief mention)

## Sources Consulted
- MongoDB PHP Library documentation: https://www.mongodb.com/docs/php-library/current/reference/method/mongodbclient__construct/
- PHP ext-mongodb Manager::__construct: https://www.php.net/manual/en/mongodb-driver-manager.construct.php
- PHP BSON deserialization / typeMap docs: https://www.php.net/manual/en/mongodb.persistence.deserialization.php
- MongoDB PHP Library BSON modeling: https://www.mongodb.com/docs/php-library/current/data-formats/modeling-bson-data/
- MongoDB PHP Library command execution: https://www.mongodb.com/docs/php-library/current/reference/method/mongodbdatabase-command/

## Issues Found

1. **`maxPoolSize` and `minPoolSize` listed as valid URI options** — The PHP MongoDB driver does not implement connection pooling. These options are valid in other MongoDB drivers (Node.js, Python, Java) but have no effect in PHP. Removed both options from the Advanced Connection Options example and updated the Summary paragraph to say "timeouts and read/write preferences" instead of "timeouts and pool size."

2. **Comment incorrectly said "Return documents as stdClass objects (default)"** — The MongoDB PHP library's default typeMap returns `MongoDB\Model\BSONDocument` and `MongoDB\Model\BSONArray`, not `stdClass`. Only the raw low-level driver extension (without the library) defaults to `stdClass`. Changed the comment to "Return documents as BSONDocument objects (default)."

3. **Custom class in typeMap missing required `Unserializable` interface** — The `Product` class used in the "Mapping to Custom Classes" section did not implement `MongoDB\BSON\Unserializable`. Any class used as a typeMap value must implement this interface (or `MongoDB\BSON\Persistable`), otherwise an `InvalidArgumentException` is thrown at runtime. Added the interface implementation with a `bsonUnserialize()` method.

4. **Unused imports removed** — `MongoDB\Driver\ReadPreference` and `MongoDB\Driver\WriteConcern` were imported in the Advanced Connection Options section but never used. Removed to avoid confusion.

## Review Notes
- The environment-based configuration section uses `$_ENV` directly. In practice, most PHP applications use a library like `vlucas/phpdotenv` or framework-provided env helpers. The code is technically correct but readers may need an additional step to populate `$_ENV` from a `.env` file.
- The Laravel singleton example is idiomatic and correct but references a config key (`database.connections.mongodb.dsn`) that would need to be defined by the user. This is reasonable for a brief example.
