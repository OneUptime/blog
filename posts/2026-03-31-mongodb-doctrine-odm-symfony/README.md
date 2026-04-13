# How to Use Doctrine MongoDB ODM with Symfony

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Symfony, PHP, Doctrine, ODM

Description: Learn how to integrate Doctrine MongoDB ODM with Symfony using DoctrineMongoDBBundle to build MongoDB-backed Symfony applications with document models and services.

---

DoctrineMongoDBBundle integrates Doctrine MongoDB ODM with Symfony's dependency injection, configuration, and console systems. You get automatic document manager injection, console commands for schema management, and full compatibility with Symfony's service container.

## Installation

```bash
composer require doctrine/mongodb-odm-bundle
```

Enable the bundle in `config/bundles.php` (auto-enabled by Symfony Flex):

```php
<?php
return [
    Doctrine\Bundle\MongoDBBundle\DoctrineMongoDBBundle::class => ['all' => true],
];
```

## Configuration

Configure the connection in `config/packages/doctrine_mongodb.yaml`:

```yaml
doctrine_mongodb:
    connections:
        default:
            server: "%env(MONGODB_URL)%"
            options: {}
    default_database: "%env(MONGODB_DB)%"
    document_managers:
        default:
            auto_mapping: true
            mappings:
                App:
                    type: attribute
                    dir: "%kernel.project_dir%/src/Document"
                    prefix: "App\\Document"
                    is_bundle: false
```

Set environment variables in `.env`:

```text
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB=myapp
```

## Defining Document Classes

```php
<?php
namespace App\Document;

use Doctrine\ODM\MongoDB\Mapping\Annotations as ODM;
use Symfony\Component\Validator\Constraints as Assert;

#[ODM\Document(collection: 'users')]
class User
{
    #[ODM\Id]
    private string $id;

    #[ODM\Field(type: 'string')]
    #[Assert\NotBlank]
    #[Assert\Email]
    private string $email;

    #[ODM\Field(type: 'string')]
    #[Assert\NotBlank]
    private string $name;

    #[ODM\Field(type: 'date_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    // getters and setters
}
```

## Injecting the Document Manager

Use constructor injection to access the document manager in services:

```php
<?php
namespace App\Service;

use App\Document\User;
use Doctrine\ODM\MongoDB\DocumentManager;

class UserService
{
    public function __construct(
        private readonly DocumentManager $dm
    ) {}

    public function createUser(string $email, string $name): User
    {
        $user = new User();
        $user->setEmail($email);
        $user->setName($name);

        $this->dm->persist($user);
        $this->dm->flush();

        return $user;
    }

    public function getUserByEmail(string $email): ?User
    {
        return $this->dm->getRepository(User::class)
            ->findOneBy(['email' => $email]);
    }
}
```

## Custom Repository in Symfony

```php
<?php
namespace App\Repository;

use App\Document\User;
use Doctrine\ODM\MongoDB\Repository\DocumentRepository;

class UserRepository extends DocumentRepository
{
    public function findRecentUsers(int $limit = 10): array
    {
        return $this->createQueryBuilder()
            ->sort('createdAt', 'DESC')
            ->limit($limit)
            ->getQuery()
            ->execute()
            ->toArray();
    }
}
```

Register it on the document:

```php
#[ODM\Document(collection: 'users', repositoryClass: UserRepository::class)]
class User { ... }
```

## Using in a Symfony Controller

```php
<?php
namespace App\Controller;

use App\Service\UserService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class UserController extends AbstractController
{
    public function __construct(
        private readonly UserService $userService
    ) {}

    #[Route('/users', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $user = $this->userService->createUser($data['email'], $data['name']);
        return $this->json(['id' => $user->getId()], 201);
    }
}
```

## Useful Console Commands

DoctrineMongoDBBundle provides helpful console commands:

```bash
# Create indexes defined on documents
php bin/console doctrine:mongodb:schema:create

# Update indexes (create new, remove old)
php bin/console doctrine:mongodb:schema:update

# Drop all collections
php bin/console doctrine:mongodb:schema:drop

# Validate document mappings
php bin/console doctrine:mongodb:mapping:info
```

## Summary

DoctrineMongoDBBundle makes Doctrine MongoDB ODM a first-class citizen in Symfony applications. Document managers are injectable services, configuration follows Symfony conventions, and validation integrates with Symfony's Validator component. Custom repositories keep query logic separate from domain logic, and the built-in console commands simplify index and schema management during development and deployment.
