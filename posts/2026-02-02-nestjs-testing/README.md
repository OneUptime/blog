# How to Write Tests in NestJS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TypeScript, NestJS, Testing, Jest, Unit Tests

Description: A practical guide to testing NestJS applications with Jest, covering unit tests, integration tests, mocking, and e2e testing patterns.

---

Testing is a critical part of building reliable NestJS applications. NestJS comes with Jest preconfigured and provides a powerful testing module that makes it easy to mock dependencies and test your code in isolation. In this guide, we'll walk through the practical aspects of testing in NestJS - from unit tests to end-to-end tests.

## Testing Utilities Overview

NestJS provides several utilities through the `@nestjs/testing` package:

| Utility | Purpose |
|---------|---------|
| `Test.createTestingModule()` | Creates an isolated testing module |
| `TestingModule.compile()` | Compiles and instantiates the module |
| `TestingModule.get()` | Retrieves providers from the testing module |
| `overrideProvider()` | Replaces a provider with a mock |
| `overrideGuard()` | Replaces a guard with a mock |

## Setting Up Your Test Environment

When you create a NestJS project with the CLI, Jest is already configured. Your `package.json` includes test scripts:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  }
}
```

## Testing Services

Services contain your business logic and are the easiest to test. Let's start with a simple `UsersService`:

```typescript
// users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async create(email: string, name: string): Promise<User> {
    const user = this.usersRepository.create({ email, name });
    return this.usersRepository.save(user);
  }
}
```

Now let's write unit tests for this service:

```typescript
// users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  // Create a mock repository with jest functions
  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    // Set up the testing module before each test
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          // Provide a mock instead of the real repository
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));

    // Clear all mock calls between tests
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return a user when found', async () => {
      // Arrange - set up the mock return value
      const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };
      mockRepository.findOne.mockResolvedValue(mockUser);

      // Act - call the method we're testing
      const result = await service.findOne(1);

      // Assert - verify the results
      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange - repository returns null
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert - expect the method to throw
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a new user', async () => {
      // Arrange
      const userData = { email: 'new@example.com', name: 'New User' };
      const createdUser = { id: 1, ...userData };

      mockRepository.create.mockReturnValue(createdUser);
      mockRepository.save.mockResolvedValue(createdUser);

      // Act
      const result = await service.create(userData.email, userData.name);

      // Assert
      expect(result).toEqual(createdUser);
      expect(mockRepository.create).toHaveBeenCalledWith(userData);
      expect(mockRepository.save).toHaveBeenCalledWith(createdUser);
    });
  });
});
```

## Testing Controllers

Controllers handle HTTP requests and delegate work to services. When testing controllers, we mock the service layer:

```typescript
// users.controller.ts
import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto.email, createUserDto.name);
  }
}
```

Here's how to test it:

```typescript
// users.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  // Mock the entire service
  const mockUsersService = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      // Arrange
      const expectedUser = { id: 1, email: 'test@example.com', name: 'Test' };
      mockUsersService.findOne.mockResolvedValue(expectedUser);

      // Act
      const result = await controller.findOne(1);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      // Arrange
      const createDto = { email: 'new@example.com', name: 'New User' };
      const expectedUser = { id: 1, ...createDto };
      mockUsersService.create.mockResolvedValue(expectedUser);

      // Act
      const result = await controller.create(createDto);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(mockUsersService.create).toHaveBeenCalledWith(createDto.email, createDto.name);
    });
  });
});
```

## Mocking Providers and Dependencies

For complex dependencies, you can use factory functions or class-based mocks:

```typescript
// Using a factory function for dynamic mocks
const module: TestingModule = await Test.createTestingModule({
  providers: [
    UsersService,
    {
      provide: 'CONFIG_OPTIONS',
      useFactory: () => ({
        apiKey: 'test-api-key',
        timeout: 5000,
      }),
    },
  ],
}).compile();

// Overriding providers after module creation
const module: TestingModule = await Test.createTestingModule({
  imports: [UsersModule],
})
  .overrideProvider(UsersService)
  .useValue(mockUsersService)
  .overrideGuard(AuthGuard)
  .useValue({ canActivate: () => true })
  .compile();
```

## End-to-End Testing with Supertest

E2E tests verify your entire application stack. NestJS uses supertest for HTTP assertions:

```typescript
// test/users.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('UsersController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Create the full application for e2e testing
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same pipes and middleware as your main app
    app.useGlobalPipes(new ValidationPipe());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /users', () => {
    it('should create a new user', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({ email: 'test@example.com', name: 'Test User' })
        .expect(201)
        .expect((res) => {
          expect(res.body.email).toBe('test@example.com');
          expect(res.body.name).toBe('Test User');
          expect(res.body.id).toBeDefined();
        });
    });

    it('should return 400 for invalid data', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({ email: 'invalid-email' }) // missing name, bad email
        .expect(400);
    });
  });

  describe('GET /users/:id', () => {
    it('should return a user by id', () => {
      return request(app.getHttpServer())
        .get('/users/1')
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(1);
        });
    });

    it('should return 404 for non-existent user', () => {
      return request(app.getHttpServer())
        .get('/users/99999')
        .expect(404);
    });
  });
});
```

## Testing Best Practices

Here are some tips I've found helpful when testing NestJS apps:

1. **Keep tests focused** - Each test should verify one specific behavior. If your test description has "and" in it, consider splitting it.

2. **Use beforeEach for fresh state** - Clear mocks and recreate modules to avoid test pollution.

3. **Test the contract, not the implementation** - Focus on what the method returns or throws, not how it works internally.

4. **Use meaningful test data** - Names like `mockUser` are fine, but use realistic email formats and data structures.

5. **Don't over-mock** - Sometimes it's better to use the real implementation, especially for simple utility classes.

## Running Your Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode during development
npm run test:watch

# Generate coverage report
npm run test:cov

# Run e2e tests
npm run test:e2e
```

## Conclusion

Testing in NestJS is straightforward once you understand the testing module pattern. The key is to isolate units by mocking their dependencies, and then verify they behave correctly under different conditions. Start with unit tests for your services and controllers, then add e2e tests for critical user flows. With this foundation, you can build confidence in your NestJS applications and catch bugs before they reach production.
