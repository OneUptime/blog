# How to Mock API Calls in React Tests with MSW (Mock Service Worker)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, MSW, Testing, API Mocking, Mock Service Worker, Frontend

Description: Learn to mock API calls in React tests using MSW (Mock Service Worker) for reliable, network-independent component testing with realistic API simulations.

---

Testing React components that make API calls has always been challenging. Real network requests make tests slow, flaky, and dependent on external services. Mock Service Worker (MSW) solves this by intercepting requests at the network level, providing a clean and realistic way to mock APIs in your React tests.

## Why MSW for React Testing?

| Approach | Problems |
|----------|----------|
| **Mocking fetch/axios** | Couples tests to implementation |
| **Jest.mock modules** | Doesn't test actual network code |
| **Real API calls** | Slow, flaky, costs money |
| **MSW** | Network-level interception, realistic |

MSW intercepts requests at the network level, meaning your components make real HTTP requests that get intercepted before leaving the application. This tests your actual code paths without the downsides of real network calls.

## Installing MSW

First, install MSW and its peer dependencies:

```bash
npm install msw --save-dev
```

For TypeScript projects:

```bash
npm install msw @types/node --save-dev
```

## Project Structure for MSW Mocks

Organize your mocks in a dedicated directory:

```
src/
  mocks/
    handlers.js       # API route handlers
    server.js         # Test server setup
    browser.js        # Browser service worker (optional)
  components/
    UserProfile.jsx
    UserProfile.test.jsx
```

## Setting Up the Mock Server

Create the mock server configuration that will intercept requests in your test environment.

### Basic Handler Setup

Handlers define how MSW responds to specific API routes. Think of them as mock endpoints:

```javascript
// src/mocks/handlers.js
import { http, HttpResponse } from 'msw';

// Define handlers for API endpoints your app uses
export const handlers = [
  // GET request handler
  http.get('/api/users/:userId', ({ params }) => {
    const { userId } = params;

    return HttpResponse.json({
      id: userId,
      name: 'John Doe',
      email: 'john@example.com',
      avatar: 'https://example.com/avatar.jpg',
    });
  }),

  // POST request handler
  http.post('/api/users', async ({ request }) => {
    const body = await request.json();

    return HttpResponse.json({
      id: 'new-user-123',
      ...body,
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  // PUT request handler for updates
  http.put('/api/users/:userId', async ({ params, request }) => {
    const { userId } = params;
    const updates = await request.json();

    return HttpResponse.json({
      id: userId,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }),

  // DELETE request handler
  http.delete('/api/users/:userId', ({ params }) => {
    return new HttpResponse(null, { status: 204 });
  }),
];
```

### Server Configuration

Create the server instance that uses your handlers:

```javascript
// src/mocks/server.js
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create the mock server instance
export const server = setupServer(...handlers);
```

### Test Setup Integration

Configure your test environment to use MSW. For Jest, create or update your setup file:

```javascript
// src/setupTests.js
import '@testing-library/jest-dom';
import { server } from './mocks/server';

// Start server before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'error', // Fail on unmocked requests
  });
});

// Reset handlers after each test to prevent test pollution
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests complete
afterAll(() => {
  server.close();
});
```

Configure Jest to use the setup file:

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  // Add this for MSW to work correctly with Jest
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
};
```

## Testing React Components with MSW

Now let's test actual React components. Here's a typical data-fetching component:

### Example Component: UserProfile

```javascript
// src/components/UserProfile.jsx
import { useState, useEffect } from 'react';

export function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/users/${userId}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('User not found');
          }
          throw new Error('Failed to fetch user');
        }

        const data = await response.json();
        setUser(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [userId]);

  if (loading) {
    return <div data-testid="loading">Loading...</div>;
  }

  if (error) {
    return <div data-testid="error" role="alert">{error}</div>;
  }

  return (
    <div data-testid="user-profile">
      <img src={user.avatar} alt={user.name} />
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}
```

### Testing the Component

```javascript
// src/components/UserProfile.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { UserProfile } from './UserProfile';

describe('UserProfile', () => {
  it('displays loading state initially', () => {
    render(<UserProfile userId="123" />);

    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('displays user data after successful fetch', async () => {
    // Uses default handler from handlers.js
    render(<UserProfile userId="123" />);

    // Wait for loading to finish and user data to appear
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    // Verify user profile is displayed
    expect(screen.getByTestId('user-profile')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('displays error message when user not found', async () => {
    // Override default handler for this specific test
    server.use(
      http.get('/api/users/:userId', () => {
        return new HttpResponse(null, { status: 404 });
      })
    );

    render(<UserProfile userId="nonexistent" />);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });

    expect(screen.getByText('User not found')).toBeInTheDocument();
  });

  it('displays generic error on server failure', async () => {
    server.use(
      http.get('/api/users/:userId', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    render(<UserProfile userId="123" />);

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to fetch user')).toBeInTheDocument();
  });
});
```

## Advanced Handler Patterns

### Dynamic Response Based on Request

Create handlers that return different data based on request parameters:

```javascript
// src/mocks/handlers.js
import { http, HttpResponse } from 'msw';

// In-memory data store for tests
const users = {
  '1': { id: '1', name: 'Alice', email: 'alice@example.com' },
  '2': { id: '2', name: 'Bob', email: 'bob@example.com' },
  '3': { id: '3', name: 'Charlie', email: 'charlie@example.com' },
};

export const handlers = [
  http.get('/api/users/:userId', ({ params }) => {
    const user = users[params.userId];

    if (!user) {
      return new HttpResponse(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return HttpResponse.json(user);
  }),

  // List users with pagination
  http.get('/api/users', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    const allUsers = Object.values(users);
    const start = (page - 1) * limit;
    const paginatedUsers = allUsers.slice(start, start + limit);

    return HttpResponse.json({
      users: paginatedUsers,
      total: allUsers.length,
      page,
      totalPages: Math.ceil(allUsers.length / limit),
    });
  }),
];
```

### Request Body Validation

Validate incoming request data and return appropriate errors:

```javascript
http.post('/api/users', async ({ request }) => {
  const body = await request.json();

  // Validate required fields
  const errors = [];

  if (!body.email) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!body.email.includes('@')) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }

  if (!body.name) {
    errors.push({ field: 'name', message: 'Name is required' });
  }

  if (body.password && body.password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
  }

  if (errors.length > 0) {
    return HttpResponse.json({ errors }, { status: 400 });
  }

  return HttpResponse.json({
    id: crypto.randomUUID(),
    ...body,
    createdAt: new Date().toISOString(),
  }, { status: 201 });
}),
```

### Simulating Network Delays

Test loading states and timeout handling with artificial delays:

```javascript
import { http, HttpResponse, delay } from 'msw';

export const handlers = [
  http.get('/api/slow-endpoint', async () => {
    // Simulate 2 second delay
    await delay(2000);

    return HttpResponse.json({ data: 'slow response' });
  }),

  // Random delay between min and max
  http.get('/api/variable-delay', async () => {
    await delay(); // Uses realistic random delay (100-400ms)

    return HttpResponse.json({ data: 'response' });
  }),
];
```

Testing with delays:

```javascript
// src/components/SlowComponent.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse, delay } from 'msw';
import { server } from '../mocks/server';
import { SlowComponent } from './SlowComponent';

describe('SlowComponent', () => {
  it('shows loading state during slow request', async () => {
    server.use(
      http.get('/api/data', async () => {
        await delay(1000);
        return HttpResponse.json({ data: 'result' });
      })
    );

    render(<SlowComponent />);

    // Should show loading immediately
    expect(screen.getByTestId('loading')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    }, { timeout: 2000 });

    expect(screen.getByText('result')).toBeInTheDocument();
  });
});
```

### Simulating Network Errors

Test error handling for network failures:

```javascript
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Simulate network error (connection refused, DNS failure, etc.)
  http.get('/api/network-error', () => {
    return HttpResponse.error();
  }),
];
```

Testing network errors:

```javascript
it('handles network errors gracefully', async () => {
  server.use(
    http.get('/api/users/:userId', () => {
      return HttpResponse.error();
    })
  );

  render(<UserProfile userId="123" />);

  await waitFor(() => {
    expect(screen.getByTestId('error')).toBeInTheDocument();
  });

  // Component should show user-friendly error message
  expect(screen.getByText(/network error|failed to fetch/i)).toBeInTheDocument();
});
```

## Testing Forms and Mutations

### Form Submission Component

```javascript
// src/components/CreateUserForm.jsx
import { useState } from 'react';

export function CreateUserForm({ onSuccess }) {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.errors?.[0]?.message || 'Failed to create user');
      }

      const newUser = await response.json();
      onSuccess?.(newUser);
      setFormData({ name: '', email: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="create-user-form">
      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>

      {error && <div data-testid="form-error" role="alert">{error}</div>}

      <button type="submit" disabled={submitting}>
        {submitting ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
}
```

### Testing Form Submission

```javascript
// src/components/CreateUserForm.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { CreateUserForm } from './CreateUserForm';

describe('CreateUserForm', () => {
  it('submits form data successfully', async () => {
    const user = userEvent.setup();
    const onSuccess = jest.fn();

    render(<CreateUserForm onSuccess={onSuccess} />);

    // Fill in the form
    await user.type(screen.getByLabelText(/name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');

    // Submit the form
    await user.click(screen.getByRole('button', { name: /create user/i }));

    // Verify success callback was called
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Jane Doe',
          email: 'jane@example.com',
        })
      );
    });
  });

  it('displays validation errors from server', async () => {
    const user = userEvent.setup();

    // Override handler to return validation error
    server.use(
      http.post('/api/users', () => {
        return HttpResponse.json({
          errors: [{ field: 'email', message: 'Email already exists' }],
        }, { status: 400 });
      })
    );

    render(<CreateUserForm />);

    await user.type(screen.getByLabelText(/name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
    await user.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByTestId('form-error')).toHaveTextContent('Email already exists');
    });
  });

  it('disables submit button while submitting', async () => {
    const user = userEvent.setup();

    // Add delay to keep form in submitting state
    server.use(
      http.post('/api/users', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json({ id: '1', name: 'Test', email: 'test@test.com' });
      })
    );

    render(<CreateUserForm />);

    await user.type(screen.getByLabelText(/name/i), 'Test');
    await user.type(screen.getByLabelText(/email/i), 'test@test.com');

    const submitButton = screen.getByRole('button', { name: /create user/i });
    await user.click(submitButton);

    // Button should be disabled during submission
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Creating...');

    // Wait for submission to complete
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });
});
```

## Testing Authentication Flows

### Authentication Handler Setup

```javascript
// src/mocks/handlers.js
let isAuthenticated = false;
let currentUser = null;

export const authHandlers = [
  // Login endpoint
  http.post('/api/auth/login', async ({ request }) => {
    const { email, password } = await request.json();

    // Simulate authentication
    if (email === 'test@example.com' && password === 'password123') {
      isAuthenticated = true;
      currentUser = { id: '1', email, name: 'Test User' };

      return HttpResponse.json({
        user: currentUser,
        token: 'mock-jwt-token',
      });
    }

    return HttpResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  // Logout endpoint
  http.post('/api/auth/logout', () => {
    isAuthenticated = false;
    currentUser = null;
    return new HttpResponse(null, { status: 204 });
  }),

  // Get current user (requires auth)
  http.get('/api/auth/me', ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!isAuthenticated) {
      return HttpResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }

    return HttpResponse.json({ user: currentUser });
  }),

  // Protected resource
  http.get('/api/protected', ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return HttpResponse.json({ secret: 'protected data' });
  }),
];

// Helper to reset auth state between tests
export function resetAuthState() {
  isAuthenticated = false;
  currentUser = null;
}
```

### Testing Protected Routes

```javascript
// src/components/ProtectedContent.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { ProtectedContent } from './ProtectedContent';

describe('ProtectedContent', () => {
  it('displays content when authenticated', async () => {
    // Handler returns success when auth header is present
    server.use(
      http.get('/api/protected', ({ request }) => {
        if (request.headers.get('Authorization')) {
          return HttpResponse.json({ data: 'secret content' });
        }
        return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
      })
    );

    // Render with auth token in context/props
    render(<ProtectedContent authToken="valid-token" />);

    await waitFor(() => {
      expect(screen.getByText('secret content')).toBeInTheDocument();
    });
  });

  it('redirects to login when not authenticated', async () => {
    server.use(
      http.get('/api/protected', () => {
        return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
      })
    );

    render(<ProtectedContent authToken={null} />);

    await waitFor(() => {
      expect(screen.getByText(/please log in/i)).toBeInTheDocument();
    });
  });
});
```

## Testing with React Query

If you're using React Query (TanStack Query), MSW works seamlessly:

### Query Client Setup for Tests

```javascript
// src/test-utils.jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Don't retry failed requests in tests
        gcTime: 0,    // Don't cache between tests (formerly cacheTime)
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // Silence error logs in tests
    },
  });
}

export function renderWithQueryClient(ui, options = {}) {
  const queryClient = createTestQueryClient();

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return {
    ...render(ui, { wrapper, ...options }),
    queryClient,
  };
}
```

### Testing React Query Components

```javascript
// src/components/UserList.jsx
import { useQuery } from '@tanstack/react-query';

export function UserList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  if (isLoading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data.users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

```javascript
// src/components/UserList.test.jsx
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { renderWithQueryClient } from '../test-utils';
import { UserList } from './UserList';

describe('UserList with React Query', () => {
  it('displays list of users', async () => {
    server.use(
      http.get('/api/users', () => {
        return HttpResponse.json({
          users: [
            { id: '1', name: 'Alice' },
            { id: '2', name: 'Bob' },
          ],
        });
      })
    );

    renderWithQueryClient(<UserList />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('displays error state on failure', async () => {
    server.use(
      http.get('/api/users', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    renderWithQueryClient(<UserList />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

## Debugging MSW Issues

### Enable Request Logging

```javascript
// src/setupTests.js
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn', // Log unhandled requests instead of erroring
  });
});

// Or log all requests for debugging
server.events.on('request:start', ({ request }) => {
  console.log('MSW intercepted:', request.method, request.url);
});

server.events.on('request:match', ({ request }) => {
  console.log('MSW matched:', request.method, request.url);
});

server.events.on('request:unhandled', ({ request }) => {
  console.log('MSW unhandled:', request.method, request.url);
});
```

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Request not intercepted | Wrong URL format | Check if URL is absolute or relative |
| Handler not matching | Method mismatch | Verify GET vs POST vs PUT etc. |
| Tests polluting each other | Missing resetHandlers | Add afterEach resetHandlers call |
| TypeScript errors | Missing types | Install @types/node |
| Fetch not defined | Node environment | Use node-fetch or undici |

## Best Practices for MSW in React Tests

### 1. Keep Handlers Realistic

```javascript
// Good: Returns realistic response structure
http.get('/api/users/:id', ({ params }) => {
  return HttpResponse.json({
    id: params.id,
    name: 'Test User',
    email: 'test@example.com',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    profile: {
      bio: 'Software developer',
      location: 'San Francisco, CA',
    },
  });
});

// Bad: Minimal response that doesn't match real API
http.get('/api/users/:id', () => {
  return HttpResponse.json({ id: '1', name: 'Test' });
});
```

### 2. Test Error Boundaries

```javascript
it('renders error boundary on API failure', async () => {
  server.use(
    http.get('/api/critical-data', () => {
      return HttpResponse.error();
    })
  );

  render(
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <CriticalDataComponent />
    </ErrorBoundary>
  );

  await waitFor(() => {
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
```

### 3. Use Factory Functions for Test Data

```javascript
// src/mocks/factories.js
import { faker } from '@faker-js/faker';

export function createUser(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    avatar: faker.image.avatar(),
    createdAt: faker.date.past().toISOString(),
    ...overrides,
  };
}

export function createPost(overrides = {}) {
  return {
    id: faker.string.uuid(),
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraphs(3),
    author: createUser(),
    publishedAt: faker.date.past().toISOString(),
    ...overrides,
  };
}
```

Using factories in handlers:

```javascript
import { createUser } from './factories';

http.get('/api/users', () => {
  return HttpResponse.json({
    users: Array.from({ length: 10 }, () => createUser()),
  });
});
```

### 4. Organize Handlers by Feature

```javascript
// src/mocks/handlers/users.js
export const userHandlers = [
  http.get('/api/users', ...),
  http.post('/api/users', ...),
  http.get('/api/users/:id', ...),
];

// src/mocks/handlers/posts.js
export const postHandlers = [
  http.get('/api/posts', ...),
  http.post('/api/posts', ...),
];

// src/mocks/handlers/index.js
import { userHandlers } from './users';
import { postHandlers } from './posts';

export const handlers = [
  ...userHandlers,
  ...postHandlers,
];
```

### 5. Type-Safe Handlers with TypeScript

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

interface User {
  id: string;
  name: string;
  email: string;
}

interface CreateUserRequest {
  name: string;
  email: string;
}

export const handlers = [
  http.get<{ userId: string }, never, User>(
    '/api/users/:userId',
    ({ params }) => {
      return HttpResponse.json({
        id: params.userId,
        name: 'John Doe',
        email: 'john@example.com',
      });
    }
  ),

  http.post<never, CreateUserRequest, User>(
    '/api/users',
    async ({ request }) => {
      const body = await request.json();
      return HttpResponse.json({
        id: 'new-user-123',
        name: body.name,
        email: body.email,
      });
    }
  ),
];
```

## Summary Table

| Concept | Description | Example |
|---------|-------------|---------|
| **Handler** | Defines mock response for a route | `http.get('/api/users', ...)` |
| **server.use()** | Override handlers for specific test | `server.use(http.get(...))` |
| **server.resetHandlers()** | Clear test-specific overrides | `afterEach(() => server.resetHandlers())` |
| **HttpResponse.json()** | Return JSON response | `HttpResponse.json({ data })` |
| **HttpResponse.error()** | Simulate network error | `return HttpResponse.error()` |
| **delay()** | Add artificial latency | `await delay(2000)` |
| **params** | Access URL parameters | `({ params }) => params.userId` |
| **request.json()** | Parse request body | `const body = await request.json()` |
| **request.headers** | Access request headers | `request.headers.get('Authorization')` |

## MSW vs Other Mocking Approaches

| Feature | MSW | Jest Mocks | Nock |
|---------|-----|------------|------|
| Network-level interception | Yes | No | Yes |
| Works in browser | Yes | No | No |
| Works in Node | Yes | Yes | Yes |
| TypeScript support | Excellent | Good | Limited |
| Framework agnostic | Yes | No | Yes |
| Realistic API simulation | Excellent | Poor | Good |
| Setup complexity | Medium | Low | Medium |
| Maintenance overhead | Low | High | Medium |

MSW provides the best balance of realism, maintainability, and developer experience for testing React applications that make API calls. By intercepting requests at the network level, your tests exercise the actual code paths your application uses in production, giving you confidence that your components work correctly with real APIs.

## Additional Resources

For more complex scenarios, consider these patterns:

- **GraphQL mocking**: MSW supports GraphQL with `graphql.query()` and `graphql.mutation()`
- **WebSocket mocking**: Use the `ws` package alongside MSW for real-time features
- **Integration testing**: Use MSW with Cypress or Playwright for end-to-end tests
- **Visual regression**: Combine MSW with Storybook for component documentation

The key to successful API mocking is maintaining realistic responses that match your actual API contracts. When your API changes, update your handlers to reflect the new structure, and your tests will catch any components that need updating.
