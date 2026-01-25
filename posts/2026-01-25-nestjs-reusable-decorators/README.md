# How to Create Reusable Decorators in NestJS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NestJS, TypeScript, Decorators, Node.js, Backend, API Development

Description: Learn how to build reusable decorators in NestJS for authentication, validation, caching, and logging. This guide covers parameter decorators, method decorators, class decorators, and decorator composition with practical examples.

---

Decorators are one of the most powerful features in NestJS. They let you add metadata and behavior to classes, methods, and parameters without cluttering your business logic. While NestJS provides many built-in decorators, creating custom ones can significantly reduce code duplication and make your codebase more maintainable.

## Understanding TypeScript Decorators

Before diving into NestJS-specific patterns, let's understand how TypeScript decorators work. A decorator is simply a function that receives information about the decorated element and can modify its behavior.

```typescript
// A basic method decorator
function LogExecutionTime() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = Date.now();
      const result = await originalMethod.apply(this, args);
      const duration = Date.now() - start;
      console.log(`${propertyKey} executed in ${duration}ms`);
      return result;
    };

    return descriptor;
  };
}
```

## Parameter Decorators for Request Data

Parameter decorators extract data from the request context. NestJS provides `@Param()`, `@Query()`, and `@Body()`, but you often need custom extraction logic.

### Current User Decorator

Extract the authenticated user from the request:

```typescript
// decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If a specific property is requested, return just that
    if (data) {
      return user?.[data];
    }

    return user;
  }
);

// Usage in a controller
@Controller('profile')
export class ProfileController {
  @Get()
  getProfile(@CurrentUser() user: User) {
    return this.profileService.findByUserId(user.id);
  }

  @Get('email')
  getEmail(@CurrentUser('email') email: string) {
    return { email };
  }
}
```

### Request Metadata Decorator

Extract common request metadata like IP address, user agent, and request ID:

```typescript
// decorators/request-metadata.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface RequestMetadata {
  ip: string;
  userAgent: string;
  requestId: string;
  timestamp: Date;
}

export const RequestMeta = createParamDecorator(
  (data: keyof RequestMetadata | undefined, ctx: ExecutionContext): RequestMetadata | string | Date => {
    const request = ctx.switchToHttp().getRequest();

    const metadata: RequestMetadata = {
      ip: request.ip || request.headers['x-forwarded-for'] || 'unknown',
      userAgent: request.headers['user-agent'] || 'unknown',
      requestId: request.headers['x-request-id'] || crypto.randomUUID(),
      timestamp: new Date(),
    };

    if (data) {
      return metadata[data];
    }

    return metadata;
  }
);

// Usage
@Post('audit')
createAuditLog(
  @Body() data: CreateAuditDto,
  @RequestMeta() meta: RequestMetadata
) {
  return this.auditService.create({
    ...data,
    ip: meta.ip,
    userAgent: meta.userAgent,
    requestId: meta.requestId,
  });
}
```

## Method Decorators for Cross-Cutting Concerns

Method decorators wrap the execution of controller methods or service functions. They are perfect for logging, caching, rate limiting, and error handling.

### Cache Response Decorator

Cache method results with configurable TTL:

```typescript
// decorators/cache-response.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY = 'cache:key';
export const CACHE_TTL = 'cache:ttl';

export interface CacheOptions {
  key?: string;
  ttl?: number; // seconds
}

export const CacheResponse = (options: CacheOptions = {}) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY, options.key || propertyKey)(target, propertyKey, descriptor);
    SetMetadata(CACHE_TTL, options.ttl || 300)(target, propertyKey, descriptor);
    return descriptor;
  };
};

// cache.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CACHE_KEY, CACHE_TTL } from './cache-response.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private cache = new Map<string, { data: any; expiry: number }>();

  constructor(private reflector: Reflector) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const cacheKey = this.reflector.get<string>(CACHE_KEY, context.getHandler());
    const cacheTTL = this.reflector.get<number>(CACHE_TTL, context.getHandler());

    if (!cacheKey) {
      return next.handle();
    }

    // Build cache key from request params
    const request = context.switchToHttp().getRequest();
    const fullKey = `${cacheKey}:${JSON.stringify(request.params)}:${JSON.stringify(request.query)}`;

    // Check cache
    const cached = this.cache.get(fullKey);
    if (cached && cached.expiry > Date.now()) {
      return of(cached.data);
    }

    // Execute and cache
    return next.handle().pipe(
      tap((data) => {
        this.cache.set(fullKey, {
          data,
          expiry: Date.now() + (cacheTTL * 1000),
        });
      })
    );
  }
}

// Usage
@Controller('products')
@UseInterceptors(CacheInterceptor)
export class ProductsController {
  @Get(':id')
  @CacheResponse({ key: 'product', ttl: 600 })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }
}
```

### Retry on Failure Decorator

Automatically retry failed operations with exponential backoff:

```typescript
// decorators/retry.decorator.ts
export interface RetryOptions {
  attempts?: number;
  delay?: number;
  backoff?: number;
  retryOn?: (error: Error) => boolean;
}

export function Retry(options: RetryOptions = {}) {
  const {
    attempts = 3,
    delay = 1000,
    backoff = 2,
    retryOn = () => true
  } = options;

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let lastError: Error;

      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error;

          // Check if we should retry this error
          if (!retryOn(error) || attempt === attempts) {
            throw error;
          }

          // Calculate delay with exponential backoff
          const waitTime = delay * Math.pow(backoff, attempt - 1);
          console.log(
            `${propertyKey} failed (attempt ${attempt}/${attempts}), retrying in ${waitTime}ms`
          );

          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      throw lastError;
    };

    return descriptor;
  };
}

// Usage in a service
@Injectable()
export class PaymentService {
  @Retry({
    attempts: 3,
    delay: 500,
    retryOn: (err) => err.message.includes('timeout')
  })
  async processPayment(paymentData: PaymentDto) {
    return this.paymentGateway.charge(paymentData);
  }
}
```

## Class Decorators for Shared Configuration

Class decorators apply configuration to entire controllers or services.

### API Version Decorator

Apply versioning to all routes in a controller:

```typescript
// decorators/api-version.decorator.ts
import { Controller, applyDecorators } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

export function ApiVersion(version: number, path: string) {
  return applyDecorators(
    Controller(`v${version}/${path}`),
    ApiTags(`v${version} - ${path}`)
  );
}

// Usage
@ApiVersion(2, 'users')
export class UsersV2Controller {
  @Get()
  findAll() {
    // This route will be: GET /v2/users
    return this.usersService.findAll();
  }
}
```

### Secure Controller Decorator

Apply authentication and authorization to all routes:

```typescript
// decorators/secure-controller.decorator.ts
import { applyDecorators, Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

export interface SecureControllerOptions {
  path: string;
  roles?: string[];
}

export function SecureController(options: SecureControllerOptions) {
  const decorators = [
    Controller(options.path),
    UseGuards(JwtAuthGuard, RolesGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  ];

  if (options.roles) {
    decorators.push(SetMetadata('roles', options.roles));
  }

  return applyDecorators(...decorators);
}

// Usage
@SecureController({ path: 'admin/users', roles: ['admin'] })
export class AdminUsersController {
  // All routes require authentication and admin role
  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}
```

## Decorator Composition

Combine multiple decorators into reusable units using `applyDecorators`:

```typescript
// decorators/public-endpoint.decorator.ts
import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export const IS_PUBLIC_KEY = 'isPublic';

export function PublicEndpoint(summary: string) {
  return applyDecorators(
    SetMetadata(IS_PUBLIC_KEY, true),
    ApiOperation({ summary }),
    ApiResponse({ status: 200, description: 'Success' })
  );
}

// decorators/authenticated-endpoint.decorator.ts
export function AuthenticatedEndpoint(summary: string, roles?: string[]) {
  const decorators = [
    ApiOperation({ summary }),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Authentication required' }),
  ];

  if (roles?.length) {
    decorators.push(
      SetMetadata('roles', roles),
      ApiForbiddenResponse({ description: 'Insufficient permissions' })
    );
  }

  return applyDecorators(...decorators);
}

// Usage
@Controller('auth')
export class AuthController {
  @Post('login')
  @PublicEndpoint('User login')
  login(@Body() credentials: LoginDto) {
    return this.authService.login(credentials);
  }

  @Get('profile')
  @AuthenticatedEndpoint('Get current user profile')
  getProfile(@CurrentUser() user: User) {
    return user;
  }

  @Delete('users/:id')
  @AuthenticatedEndpoint('Delete user', ['admin'])
  deleteUser(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
```

## Validation Decorators

Create custom validation decorators that integrate with class-validator:

```typescript
// decorators/is-unique.decorator.ts
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@ValidatorConstraint({ async: true })
@Injectable()
export class IsUniqueConstraint implements ValidatorConstraintInterface {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>
  ) {}

  async validate(value: any, args: ValidationArguments) {
    const [property] = args.constraints;
    const exists = await this.userRepository.findOne({
      where: { [property]: value },
    });
    return !exists;
  }

  defaultMessage(args: ValidationArguments) {
    const [property] = args.constraints;
    return `${property} already exists`;
  }
}

export function IsUnique(property: string, options?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: options,
      constraints: [property],
      validator: IsUniqueConstraint,
    });
  };
}

// Usage in a DTO
export class CreateUserDto {
  @IsEmail()
  @IsUnique('email', { message: 'Email is already registered' })
  email: string;

  @IsString()
  @MinLength(3)
  @IsUnique('username', { message: 'Username is taken' })
  username: string;
}
```

## Summary

| Decorator Type | Use Case | Example |
|---------------|----------|---------|
| **Parameter** | Extract request data | `@CurrentUser()`, `@RequestMeta()` |
| **Method** | Cross-cutting concerns | `@CacheResponse()`, `@Retry()` |
| **Class** | Shared configuration | `@ApiVersion()`, `@SecureController()` |
| **Composed** | Combined behavior | `@PublicEndpoint()`, `@AuthenticatedEndpoint()` |
| **Validation** | Custom validation rules | `@IsUnique()` |

Custom decorators in NestJS help you write cleaner, more maintainable code by encapsulating reusable behavior. Start with simple parameter decorators and gradually build more complex composed decorators as patterns emerge in your codebase. The key is to identify repetitive code and extract it into well-named, single-purpose decorators that clearly communicate their intent.
