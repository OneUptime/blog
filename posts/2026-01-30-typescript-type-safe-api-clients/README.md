# How to Create Type-Safe API Clients in TypeScript

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TypeScript, API, Type Safety, Axios

Description: Build type-safe API clients in TypeScript with automatic response typing, request validation, and OpenAPI schema integration for robust frontend-backend contracts.

---

Working with APIs in TypeScript without proper typing is like driving without a seatbelt. Everything works fine until it doesn't. This guide walks through building type-safe API clients that catch errors at compile time, validate data at runtime, and keep your frontend in sync with your backend.

## The Problem with Untyped API Calls

Consider this common pattern:

```typescript
// This compiles fine but has zero type safety
const response = await fetch('/api/users');
const users = await response.json(); // users is 'any'

// No error here, even though 'fullName' might not exist
console.log(users[0].fullName);
```

The `response.json()` method returns `any`, which means TypeScript cannot help you catch typos, missing fields, or incorrect assumptions about the API response shape.

## Typing Fetch Responses

The simplest improvement is adding explicit types to your fetch calls.

```typescript
// Define the expected response shape
interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

interface ApiResponse<T> {
  data: T;
  meta: {
    total: number;
    page: number;
    perPage: number;
  };
}

// Create a typed fetch wrapper
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// Now TypeScript knows the shape of the response
const result = await fetchJson<ApiResponse<User[]>>('/api/users');

// TypeScript error: Property 'fullName' does not exist on type 'User'
console.log(result.data[0].fullName);

// This works correctly
console.log(result.data[0].firstName);
```

This approach provides compile-time checking, but it trusts that the API returns exactly what you expect. If the backend changes, your types become lies.

## Typing Axios Responses

Axios has built-in generic support for response typing.

```typescript
import axios, { AxiosResponse } from 'axios';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

// Method 1: Generic on the method call
const response: AxiosResponse<User[]> = await axios.get<User[]>('/api/users');
const users = response.data; // User[]

// Method 2: Create a typed instance
const apiClient = axios.create({
  baseURL: 'https://api.example.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Type the request body and response
interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

interface CreateUserResponse {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

const newUser = await apiClient.post<CreateUserResponse, AxiosResponse<CreateUserResponse>, CreateUserRequest>(
  '/users',
  {
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Doe',
    password: 'securepassword123',
  }
);

console.log(newUser.data.id); // number
```

## Building a Generic API Client Class

A reusable API client class provides consistent typing across your application.

```typescript
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Base configuration interface
interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

// Generic API error structure
interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

// Wrapper for API responses
type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

class TypedApiClient {
  private client: AxiosInstance;

  constructor(config: ApiClientConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout ?? 10000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });
  }

  // GET request with typed response
  async get<TResponse>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResult<TResponse>> {
    try {
      const response = await this.client.get<TResponse>(url, config);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // POST request with typed request body and response
  async post<TResponse, TRequest = unknown>(
    url: string,
    data: TRequest,
    config?: AxiosRequestConfig
  ): Promise<ApiResult<TResponse>> {
    try {
      const response = await this.client.post<TResponse>(url, data, config);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // PUT request with typed request body and response
  async put<TResponse, TRequest = unknown>(
    url: string,
    data: TRequest,
    config?: AxiosRequestConfig
  ): Promise<ApiResult<TResponse>> {
    try {
      const response = await this.client.put<TResponse>(url, data, config);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // PATCH request with typed request body and response
  async patch<TResponse, TRequest = unknown>(
    url: string,
    data: TRequest,
    config?: AxiosRequestConfig
  ): Promise<ApiResult<TResponse>> {
    try {
      const response = await this.client.patch<TResponse>(url, data, config);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // DELETE request with typed response
  async delete<TResponse>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResult<TResponse>> {
    try {
      const response = await this.client.delete<TResponse>(url, config);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Centralized error handling
  private handleError(error: unknown): ApiResult<never> {
    if (axios.isAxiosError(error) && error.response) {
      return {
        success: false,
        error: {
          code: `HTTP_${error.response.status}`,
          message: error.message,
          details: error.response.data?.errors,
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }

  // Expose the underlying axios instance for advanced use cases
  getAxiosInstance(): AxiosInstance {
    return this.client;
  }
}
```

Using the typed API client:

```typescript
// Initialize the client
const api = new TypedApiClient({
  baseURL: 'https://api.example.com/v1',
  headers: {
    Authorization: 'Bearer your-token-here',
  },
});

// Define your types
interface User {
  id: number;
  email: string;
  name: string;
}

interface CreateUserPayload {
  email: string;
  name: string;
  password: string;
}

// Make typed requests
async function fetchUsers(): Promise<User[]> {
  const result = await api.get<User[]>('/users');

  if (result.success) {
    return result.data; // TypeScript knows this is User[]
  }

  console.error('Failed to fetch users:', result.error.message);
  return [];
}

async function createUser(payload: CreateUserPayload): Promise<User | null> {
  const result = await api.post<User, CreateUserPayload>('/users', payload);

  if (result.success) {
    return result.data;
  }

  // Handle validation errors
  if (result.error.details) {
    Object.entries(result.error.details).forEach(([field, errors]) => {
      console.error(`${field}: ${errors.join(', ')}`);
    });
  }

  return null;
}
```

## Runtime Validation with Zod

Static types only exist at compile time. Zod provides runtime validation that catches malformed API responses.

```typescript
import { z } from 'zod';

// Define schemas that validate at runtime
const UserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['admin', 'user', 'guest']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().nullable(),
});

// Infer TypeScript type from the schema
type User = z.infer<typeof UserSchema>;

// Schema for paginated responses
const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    meta: z.object({
      total: z.number(),
      page: z.number(),
      perPage: z.number(),
      totalPages: z.number(),
    }),
  });

const PaginatedUsersSchema = PaginatedResponseSchema(UserSchema);
type PaginatedUsers = z.infer<typeof PaginatedUsersSchema>;
```

Integrating Zod with the API client:

```typescript
import { z, ZodSchema } from 'zod';
import axios from 'axios';

// Validated fetch function
async function fetchAndValidate<T>(
  url: string,
  schema: ZodSchema<T>,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const json = await response.json();

  // Parse and validate the response
  const result = schema.safeParse(json);

  if (!result.success) {
    console.error('Validation errors:', result.error.format());
    throw new Error('API response validation failed');
  }

  return result.data;
}

// Usage with automatic type inference
const users = await fetchAndValidate('/api/users', PaginatedUsersSchema);
// users is correctly typed as PaginatedUsers
```

A more robust version with detailed error handling:

```typescript
import { z, ZodSchema, ZodError } from 'zod';

// Custom error class for validation failures
class ApiValidationError extends Error {
  constructor(
    public readonly path: string,
    public readonly zodError: ZodError
  ) {
    super(`API validation failed for ${path}`);
    this.name = 'ApiValidationError';
  }

  getFieldErrors(): Record<string, string[]> {
    const errors: Record<string, string[]> = {};

    this.zodError.errors.forEach((err) => {
      const path = err.path.join('.');
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(err.message);
    });

    return errors;
  }
}

// Extended API client with validation
class ValidatedApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async get<T>(path: string, schema: ZodSchema<T>): Promise<T> {
    const response = await fetch(`${this.baseURL}${path}`);
    const json = await response.json();

    const result = schema.safeParse(json);

    if (!result.success) {
      throw new ApiValidationError(path, result.error);
    }

    return result.data;
  }

  async post<TResponse, TRequest>(
    path: string,
    data: TRequest,
    requestSchema: ZodSchema<TRequest>,
    responseSchema: ZodSchema<TResponse>
  ): Promise<TResponse> {
    // Validate request data before sending
    const validatedRequest = requestSchema.parse(data);

    const response = await fetch(`${this.baseURL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validatedRequest),
    });

    const json = await response.json();

    // Validate response data
    const result = responseSchema.safeParse(json);

    if (!result.success) {
      throw new ApiValidationError(path, result.error);
    }

    return result.data;
  }
}
```

## OpenAPI TypeScript Code Generation

For larger projects, generate types directly from your OpenAPI specification. This keeps frontend and backend in sync automatically.

### Comparison of Code Generation Tools

| Tool | Pros | Cons | Best For |
|------|------|------|----------|
| openapi-typescript | Lightweight, types only | No runtime validation | Type-only projects |
| openapi-fetch | Built-in fetch client | Less flexible | Simple REST APIs |
| orval | Generates full clients | Larger bundle size | Complex APIs |
| swagger-typescript-api | Feature-rich | Steep learning curve | Enterprise projects |

### Using openapi-typescript

Install the package:

```bash
npm install openapi-typescript
npm install openapi-fetch
```

Generate types from your OpenAPI spec:

```bash
npx openapi-typescript https://api.example.com/openapi.json -o ./src/api/types.ts
```

The generated types look like this:

```typescript
// Generated file: src/api/types.ts
export interface paths {
  '/users': {
    get: {
      responses: {
        200: {
          content: {
            'application/json': components['schemas']['User'][];
          };
        };
      };
    };
    post: {
      requestBody: {
        content: {
          'application/json': components['schemas']['CreateUserRequest'];
        };
      };
      responses: {
        201: {
          content: {
            'application/json': components['schemas']['User'];
          };
        };
      };
    };
  };
  '/users/{id}': {
    get: {
      parameters: {
        path: {
          id: number;
        };
      };
      responses: {
        200: {
          content: {
            'application/json': components['schemas']['User'];
          };
        };
        404: {
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
      };
    };
  };
}

export interface components {
  schemas: {
    User: {
      id: number;
      email: string;
      firstName: string;
      lastName: string;
      createdAt: string;
    };
    CreateUserRequest: {
      email: string;
      firstName: string;
      lastName: string;
      password: string;
    };
    Error: {
      code: string;
      message: string;
    };
  };
}
```

Using openapi-fetch with generated types:

```typescript
import createClient from 'openapi-fetch';
import type { paths } from './api/types';

const client = createClient<paths>({
  baseUrl: 'https://api.example.com',
});

// Fully typed request and response
const { data, error } = await client.GET('/users');

if (data) {
  // TypeScript knows data is User[]
  data.forEach((user) => {
    console.log(user.firstName); // Works
    console.log(user.fullName);  // TypeScript error
  });
}

// Path parameters are type-checked
const { data: user } = await client.GET('/users/{id}', {
  params: {
    path: { id: 123 },
  },
});

// Request body is validated against the schema
const { data: newUser } = await client.POST('/users', {
  body: {
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    password: 'secure123',
  },
});
```

## Error Type Narrowing

TypeScript's type narrowing helps handle different error scenarios safely.

```typescript
// Define specific error types
interface ValidationError {
  type: 'validation';
  fields: Record<string, string[]>;
}

interface NotFoundError {
  type: 'not_found';
  resource: string;
  id: string | number;
}

interface AuthError {
  type: 'auth';
  reason: 'expired' | 'invalid' | 'missing';
}

interface NetworkError {
  type: 'network';
  message: string;
}

type ApiError = ValidationError | NotFoundError | AuthError | NetworkError;

// Type guard functions
function isValidationError(error: ApiError): error is ValidationError {
  return error.type === 'validation';
}

function isNotFoundError(error: ApiError): error is NotFoundError {
  return error.type === 'not_found';
}

function isAuthError(error: ApiError): error is AuthError {
  return error.type === 'auth';
}

// Error handling with narrowing
function handleApiError(error: ApiError): void {
  switch (error.type) {
    case 'validation':
      // TypeScript knows error.fields exists here
      Object.entries(error.fields).forEach(([field, messages]) => {
        console.error(`${field}: ${messages.join(', ')}`);
      });
      break;

    case 'not_found':
      // TypeScript knows error.resource and error.id exist here
      console.error(`${error.resource} with ID ${error.id} not found`);
      break;

    case 'auth':
      // TypeScript knows error.reason exists here
      if (error.reason === 'expired') {
        refreshToken();
      } else {
        redirectToLogin();
      }
      break;

    case 'network':
      // TypeScript knows error.message exists here
      console.error('Network error:', error.message);
      break;
  }
}
```

Integrating error narrowing with the API client:

```typescript
type ApiResult<T, E extends ApiError = ApiError> =
  | { ok: true; data: T }
  | { ok: false; error: E };

// Endpoint-specific error types
type GetUserResult = ApiResult<User, NotFoundError | AuthError>;
type CreateUserResult = ApiResult<User, ValidationError | AuthError>;

async function getUser(id: number): Promise<GetUserResult> {
  try {
    const response = await fetch(`/api/users/${id}`);

    if (response.ok) {
      return { ok: true, data: await response.json() };
    }

    if (response.status === 404) {
      return {
        ok: false,
        error: { type: 'not_found', resource: 'User', id },
      };
    }

    if (response.status === 401) {
      return {
        ok: false,
        error: { type: 'auth', reason: 'invalid' },
      };
    }

    throw new Error('Unexpected error');
  } catch {
    throw new Error('Network error');
  }
}

// Usage with full type safety
const result = await getUser(123);

if (result.ok) {
  console.log(result.data.email); // User type
} else {
  // error is NotFoundError | AuthError
  if (result.error.type === 'not_found') {
    console.log(`User ${result.error.id} not found`);
  }
}
```

## Typed Interceptors

Axios interceptors can be typed to transform requests and responses safely.

```typescript
import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosError
} from 'axios';

// Extended config with custom properties
interface CustomAxiosConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _startTime?: number;
}

// Token refresh response
interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Create typed interceptors
function setupInterceptors(client: AxiosInstance): void {
  // Request interceptor for adding auth and timing
  client.interceptors.request.use(
    (config: CustomAxiosConfig) => {
      // Add timing for performance monitoring
      config._startTime = Date.now();

      // Add auth token from storage
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for logging and token refresh
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      const config = response.config as CustomAxiosConfig;

      // Log request duration
      if (config._startTime) {
        const duration = Date.now() - config._startTime;
        console.log(`${config.method?.toUpperCase()} ${config.url} - ${duration}ms`);
      }

      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as CustomAxiosConfig;

      // Handle 401 with token refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem('refreshToken');
          const response = await axios.post<TokenResponse>('/auth/refresh', {
            refreshToken,
          });

          const { accessToken } = response.data;
          localStorage.setItem('accessToken', accessToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return client(originalRequest);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );
}
```

Creating a typed interceptor factory:

```typescript
import { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Interceptor types
type RequestInterceptor = (
  config: InternalAxiosRequestConfig
) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;

type ResponseInterceptor = (
  response: AxiosResponse
) => AxiosResponse | Promise<AxiosResponse>;

type ErrorInterceptor = (error: unknown) => Promise<never>;

interface InterceptorConfig {
  request?: {
    onFulfilled?: RequestInterceptor;
    onRejected?: ErrorInterceptor;
  };
  response?: {
    onFulfilled?: ResponseInterceptor;
    onRejected?: ErrorInterceptor;
  };
}

// Factory function for creating typed interceptors
function createInterceptors(configs: InterceptorConfig[]): (client: AxiosInstance) => void {
  return (client: AxiosInstance) => {
    configs.forEach((config) => {
      if (config.request) {
        client.interceptors.request.use(
          config.request.onFulfilled,
          config.request.onRejected
        );
      }

      if (config.response) {
        client.interceptors.response.use(
          config.response.onFulfilled,
          config.response.onRejected
        );
      }
    });
  };
}

// Example interceptors
const loggingInterceptor: InterceptorConfig = {
  request: {
    onFulfilled: (config) => {
      console.log(`Request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    },
  },
  response: {
    onFulfilled: (response) => {
      console.log(`Response: ${response.status} ${response.config.url}`);
      return response;
    },
  },
};

const authInterceptor: InterceptorConfig = {
  request: {
    onFulfilled: (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
  },
};

// Apply interceptors to client
const client = axios.create({ baseURL: 'https://api.example.com' });
const applyInterceptors = createInterceptors([loggingInterceptor, authInterceptor]);
applyInterceptors(client);
```

## Putting It All Together

Here is a complete example combining all the patterns into a production-ready API client:

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';
import { z, ZodSchema } from 'zod';

// Error types
type ApiErrorType = 'validation' | 'not_found' | 'auth' | 'server' | 'network';

interface TypedApiError {
  type: ApiErrorType;
  status?: number;
  message: string;
  details?: Record<string, string[]>;
}

// Result type
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: TypedApiError };

// Client configuration
interface ClientConfig {
  baseURL: string;
  getAuthToken?: () => string | null;
  onAuthError?: () => void;
}

// The complete typed API client
class ProductionApiClient {
  private client: AxiosInstance;
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Add auth token to requests
    this.client.interceptors.request.use((config) => {
      if (this.config.getAuthToken) {
        const token = this.config.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });

    // Handle auth errors globally
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401 && this.config.onAuthError) {
          this.config.onAuthError();
        }
        return Promise.reject(error);
      }
    );
  }

  // GET with Zod validation
  async get<T>(path: string, schema: ZodSchema<T>): Promise<Result<T>> {
    try {
      const response = await this.client.get(path);
      const parsed = schema.safeParse(response.data);

      if (!parsed.success) {
        return {
          success: false,
          error: {
            type: 'validation',
            message: 'Response validation failed',
            details: this.formatZodErrors(parsed.error),
          },
        };
      }

      return { success: true, data: parsed.data };
    } catch (error) {
      return { success: false, error: this.parseError(error) };
    }
  }

  // POST with request and response validation
  async post<TReq, TRes>(
    path: string,
    data: TReq,
    requestSchema: ZodSchema<TReq>,
    responseSchema: ZodSchema<TRes>
  ): Promise<Result<TRes>> {
    // Validate request first
    const reqParsed = requestSchema.safeParse(data);
    if (!reqParsed.success) {
      return {
        success: false,
        error: {
          type: 'validation',
          message: 'Request validation failed',
          details: this.formatZodErrors(reqParsed.error),
        },
      };
    }

    try {
      const response = await this.client.post(path, reqParsed.data);
      const resParsed = responseSchema.safeParse(response.data);

      if (!resParsed.success) {
        return {
          success: false,
          error: {
            type: 'validation',
            message: 'Response validation failed',
            details: this.formatZodErrors(resParsed.error),
          },
        };
      }

      return { success: true, data: resParsed.data };
    } catch (error) {
      return { success: false, error: this.parseError(error) };
    }
  }

  private parseError(error: unknown): TypedApiError {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (!error.response) {
        return { type: 'network', message: 'Network error' };
      }

      if (status === 401 || status === 403) {
        return { type: 'auth', status, message: 'Authentication failed' };
      }

      if (status === 404) {
        return { type: 'not_found', status, message: 'Resource not found' };
      }

      if (status === 422) {
        return {
          type: 'validation',
          status,
          message: 'Validation failed',
          details: error.response.data?.errors,
        };
      }

      return { type: 'server', status, message: error.message };
    }

    return { type: 'network', message: 'Unknown error' };
  }

  private formatZodErrors(error: z.ZodError): Record<string, string[]> {
    const formatted: Record<string, string[]> = {};
    error.errors.forEach((err) => {
      const path = err.path.join('.');
      if (!formatted[path]) {
        formatted[path] = [];
      }
      formatted[path].push(err.message);
    });
    return formatted;
  }
}

// Usage example
const UserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
});

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
});

type User = z.infer<typeof UserSchema>;
type CreateUserInput = z.infer<typeof CreateUserSchema>;

const api = new ProductionApiClient({
  baseURL: 'https://api.example.com',
  getAuthToken: () => localStorage.getItem('token'),
  onAuthError: () => {
    window.location.href = '/login';
  },
});

// Fully typed and validated API calls
async function getUser(id: number): Promise<User | null> {
  const result = await api.get(`/users/${id}`, UserSchema);

  if (result.success) {
    return result.data;
  }

  console.error(result.error.message);
  return null;
}

async function createUser(input: CreateUserInput): Promise<User | null> {
  const result = await api.post('/users', input, CreateUserSchema, UserSchema);

  if (result.success) {
    return result.data;
  }

  if (result.error.details) {
    Object.entries(result.error.details).forEach(([field, errors]) => {
      console.error(`${field}: ${errors.join(', ')}`);
    });
  }

  return null;
}
```

## Summary

Building type-safe API clients in TypeScript requires multiple layers of protection:

1. **Static typing** catches errors at compile time but trusts the API implicitly
2. **Runtime validation with Zod** verifies that responses match expected shapes
3. **OpenAPI code generation** keeps types synchronized with your backend
4. **Error type narrowing** enables precise error handling
5. **Typed interceptors** ensure consistency across all requests

The investment in proper typing pays off quickly. You catch bugs earlier, get better IDE support, and spend less time debugging production issues caused by API mismatches.

Start with basic response typing, add Zod validation for critical endpoints, and consider OpenAPI generation as your API surface grows. Each layer adds confidence that your frontend and backend are speaking the same language.
