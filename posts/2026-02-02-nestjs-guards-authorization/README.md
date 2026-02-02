# How to Use Guards for Authorization in NestJS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TypeScript, NestJS, Guards, Authorization, Security

Description: Learn how to implement authorization in NestJS using guards, including JWT guards, role-based access control, and custom guard logic.

---

Guards are one of the most powerful features in NestJS for handling authorization. They determine whether a request should be processed by a route handler based on conditions you define - like checking if a user is authenticated or has the right permissions.

If you have worked with middleware in Express, guards serve a similar purpose but with better integration into NestJS's dependency injection system and decorator-based approach.

## Understanding the CanActivate Interface

Every guard in NestJS implements the `CanActivate` interface. This interface has a single method called `canActivate` that returns a boolean (or a Promise/Observable that resolves to a boolean). When it returns `true`, the request proceeds. When it returns `false`, NestJS throws a `ForbiddenException`.

```typescript
// auth.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    // Check if the request has a valid authorization header
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return false; // No token, deny access
    }

    // In a real app, you would validate the token here
    return this.validateToken(authHeader);
  }

  private validateToken(token: string): boolean {
    // Your token validation logic
    return token.startsWith('Bearer ');
  }
}
```

## Execution Context

The `ExecutionContext` parameter gives you access to the current request context. It extends `ArgumentsHost` and provides additional methods to get metadata about the current handler being executed.

```typescript
// You can access different types of contexts
const httpContext = context.switchToHttp();
const request = httpContext.getRequest();
const response = httpContext.getResponse();

// For WebSocket contexts
const wsContext = context.switchToWs();
const client = wsContext.getClient();

// For RPC/microservice contexts
const rpcContext = context.switchToRpc();
const data = rpcContext.getData();
```

The execution context also lets you access the handler and class being invoked:

```typescript
const handler = context.getHandler(); // Returns the route handler method
const controllerClass = context.getClass(); // Returns the controller class
```

This becomes useful when you want to read metadata attached via decorators.

## Applying Guards

Guards can be applied at three levels:

| Level | Decorator | Scope |
|-------|-----------|-------|
| Method | `@UseGuards()` on method | Single route handler |
| Controller | `@UseGuards()` on class | All routes in controller |
| Global | `app.useGlobalGuards()` | All routes in application |

```typescript
// Method-level guard
@Controller('users')
export class UsersController {
  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile() {
    return { message: 'This route is protected' };
  }
}

// Controller-level guard - protects all routes in this controller
@Controller('admin')
@UseGuards(AuthGuard)
export class AdminController {
  @Get('dashboard')
  getDashboard() {
    return { message: 'Admin dashboard' };
  }

  @Get('settings')
  getSettings() {
    return { message: 'Admin settings' };
  }
}
```

For global guards in your `main.ts`:

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuthGuard } from './guards/auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply guard globally - note: this approach doesn't support DI
  app.useGlobalGuards(new AuthGuard());

  await app.listen(3000);
}
bootstrap();
```

If your global guard needs dependency injection, register it through a module instead:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './guards/auth.guard';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
```

## JWT Authentication Guard

For JWT-based authentication, you can use `@nestjs/passport` with passport-jwt:

```typescript
// jwt-auth.guard.ts
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Call the parent AuthGuard's canActivate method
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // You can throw custom exceptions here
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}
```

The corresponding JWT strategy:

```typescript
// jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  // This method is called after the token is verified
  async validate(payload: any) {
    // The returned value is attached to request.user
    return { userId: payload.sub, email: payload.email, roles: payload.roles };
  }
}
```

## Role-Based Access Control

Role guards check if the authenticated user has the required role to access a resource. First, create a custom decorator to set required roles:

```typescript
// roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

Then create the roles guard:

```typescript
// roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get the roles required for this route from metadata
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow access
    if (!requiredRoles) {
      return true;
    }

    // Get the user from the request (set by JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest();

    // Check if user has at least one of the required roles
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

Use it in your controllers:

```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard) // JwtAuthGuard must run first
export class AdminController {
  @Get('users')
  @Roles('admin', 'moderator')
  getUsers() {
    return this.usersService.findAll();
  }

  @Delete('users/:id')
  @Roles('admin') // Only admins can delete users
  deleteUser(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
```

## Guard Execution Order

When multiple guards are applied, they execute in a specific order:

| Order | Guard Type |
|-------|------------|
| 1 | Global guards (in order registered) |
| 2 | Controller guards (left to right) |
| 3 | Method guards (left to right) |

Within `@UseGuards(Guard1, Guard2, Guard3)`, Guard1 runs first, then Guard2, then Guard3. If any guard returns false, the subsequent guards do not run.

```typescript
// Guard execution order: AuthGuard -> RolesGuard -> ThrottlerGuard
@UseGuards(AuthGuard, RolesGuard, ThrottlerGuard)
@Get('sensitive-data')
getData() {
  return this.service.getSensitiveData();
}
```

## Combining Guards with Custom Logic

Sometimes you need more complex authorization logic. Here is a guard that checks multiple conditions:

```typescript
// permission.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // No user means not authenticated
    if (!user) {
      return false;
    }

    // Get required permission from decorator metadata
    const requiredPermission = this.reflector.get<string>(
      'permission',
      context.getHandler(),
    );

    if (!requiredPermission) {
      return true; // No specific permission required
    }

    // Check user's permissions against the required one
    const hasPermission = await this.permissionService.userHasPermission(
      user.id,
      requiredPermission,
    );

    // Also check if the user owns the resource (for edit/delete operations)
    const resourceId = request.params.id;
    if (resourceId) {
      const ownsResource = await this.permissionService.userOwnsResource(
        user.id,
        resourceId,
      );
      return hasPermission || ownsResource;
    }

    return hasPermission;
  }
}
```

## Public Routes with Global Guards

When using a global authentication guard, you often need to allow certain routes to be public. Create a decorator and modify your guard:

```typescript
// public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

```typescript
// jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Skip authentication for public routes
    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
```

Now you can mark routes as public:

```typescript
@Controller('auth')
export class AuthController {
  @Public()
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
}
```

## Summary

Guards provide a clean, declarative way to handle authorization in NestJS applications. They integrate well with the framework's dependency injection system and work nicely with custom decorators for metadata-driven access control.

Start with simple authentication guards and build up to role-based and permission-based guards as your application grows. The combination of guards, decorators, and the Reflector gives you all the tools needed for sophisticated authorization schemes without cluttering your route handlers with access control logic.
