# How to Use IPv6 with NestJS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, IPv6, NestJS, TypeScript, HTTP, REST API

Description: Configure IPv6 in NestJS applications including server binding, request interceptors, custom decorators for client IP, and class-validator integration.

## Binding NestJS to IPv6

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Listen on all IPv6 interfaces
    await app.listen(3000, '::');
    console.log(`Server on ${await app.getUrl()}`);
}

bootstrap();
```

For Fastify adapter:

```typescript
// main.ts (Fastify adapter)
import { NestFactory } from '@nestjs/core';
import {
    FastifyAdapter,
    NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter(),
    );

    await app.listen(3000, '::');
    console.log('Fastify NestJS on [::]:3000');
}

bootstrap();
```

## Custom Decorator to Extract Client IP

Prefer the framework-populated `req.ip` value. Behind a reverse proxy, enable Express `trust proxy` or Fastify `trustProxy` so it is derived from `X-Forwarded-For`.

```typescript
// client-ip.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

type HttpRequestLike = {
    ip?: string;
    socket: {
        remoteAddress?: string;
    };
};

export function extractClientIP(req: HttpRequestLike): string {
    // Prefer req.ip so the adapter can apply trusted proxy settings.
    let ip = req.ip || req.socket.remoteAddress || '';

    // Unwrap IPv4-mapped
    if (ip.startsWith('::ffff:')) {
        ip = ip.slice(7);
    }

    return ip;
}

export const ClientIP = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): string => {
        const request = ctx.switchToHttp().getRequest<HttpRequestLike>();
        return extractClientIP(request);
    },
);
```

Use the decorator in controllers:

```typescript
// app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ClientIP } from './client-ip.decorator';

@Controller()
export class AppController {
    @Get('/me')
    getMyIP(@ClientIP() ip: string): object {
        return {
            ip,
            version: ip.includes(':') ? 'IPv6' : 'IPv4',
        };
    }
}
```

## IPv6 Address Validation with class-validator

```typescript
// create-device.dto.ts
import { IsString, IsNotEmpty, IsIP, IsOptional, Min, Max, IsInt } from 'class-validator';

export class CreateDeviceDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsIP('6')  // validates IPv6 only
    ipv6Address: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(128)
    prefixLen?: number;
}
```

```typescript
// devices.controller.ts
import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import { CreateDeviceDto } from './create-device.dto';

@Controller('devices')
export class DevicesController {
    @Post()
    create(@Body(ValidationPipe) dto: CreateDeviceDto) {
        return {
            message: 'Device created',
            ...dto,
        };
    }
}
```

## Interceptor for IPv6 Request Logging

```typescript
// ipv6-logging.interceptor.ts
import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { extractClientIP } from './client-ip.decorator';

@Injectable()
export class IPv6LoggingInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest();
        const ip = extractClientIP(req);

        const start = Date.now();

        return next.handle().pipe(
            tap(() => {
                const elapsed = Date.now() - start;
                console.log(`[${ip}] ${req.method} ${req.url} +${elapsed}ms`);
            }),
        );
    }
}
```

Apply globally in `main.ts`:

```typescript
const app = await NestFactory.create(AppModule);
app.useGlobalInterceptors(new IPv6LoggingInterceptor());
await app.listen(3000, '::');
```

## Guard for IPv6 Allow List

```typescript
// ipv6-allowlist.guard.ts
import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { extractClientIP } from './client-ip.decorator';

@Injectable()
export class IPv6AllowListGuard implements CanActivate {
    private readonly allowed = new Set([
        '::1',
        '2001:db8::100',
    ]);

    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest();
        const ip = extractClientIP(req);

        if (!this.allowed.has(ip)) {
            throw new ForbiddenException(`Access denied for ${ip}`);
        }

        return true;
    }
}
```

## Conclusion

NestJS supports IPv6 by passing `'::'` as the host to `app.listen()`. Custom parameter decorators cleanly extract and normalize client IPs including stripping IPv4-mapped addresses. `class-validator`'s `@IsIP('6')` validates IPv6 addresses in DTOs. Interceptors provide consistent IPv6-aware request logging. Guards enforce IPv6 allow-lists at the route level. The same patterns work with both Express and Fastify adapters.
