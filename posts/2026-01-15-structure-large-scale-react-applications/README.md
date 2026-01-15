# How to Structure Large-Scale React Applications for Maintainability

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Architecture, TypeScript, Frontend, Best Practices, Scalability

Description: A comprehensive guide to organizing React codebases that scale gracefully, covering folder structures, patterns, and architectural decisions that keep large teams productive and code maintainable.

---

## Why Structure Matters at Scale

When a React application grows from a few components to hundreds, the difference between a well-structured codebase and a tangled mess becomes painfully obvious. Teams slow down, bugs multiply, and onboarding takes weeks instead of days. The right structure is not about following trends - it is about reducing cognitive load, enabling parallel development, and making the codebase predictable.

This guide covers battle-tested patterns for organizing large React applications. Whether you are building a SaaS dashboard, an e-commerce platform, or an internal tool, these principles will help your codebase stay maintainable as it grows.

## 1. The Feature-Based Folder Structure

The most scalable approach for large React applications is organizing code by feature rather than by type. Instead of grouping all components together, all hooks together, and all services together, you colocate everything related to a single feature in one place.

### Traditional (Type-Based) Structure - Avoid This at Scale

```
src/
  components/
    Button.tsx
    Modal.tsx
    UserAvatar.tsx
    TeamCard.tsx
    IncidentBadge.tsx
    StatusIndicator.tsx
    ... (200 more files)
  hooks/
    useAuth.ts
    useTeam.ts
    useIncidents.ts
    ... (100 more files)
  services/
    authService.ts
    teamService.ts
    incidentService.ts
    ... (50 more files)
  pages/
    Dashboard.tsx
    Settings.tsx
    Incidents.tsx
```

This structure breaks down quickly because:
- Finding all code related to "incidents" requires searching multiple folders
- Circular dependencies become harder to track
- Teams stepping on each other's toes when working on different features
- Deleting a feature means hunting through the entire codebase

### Feature-Based Structure - The Scalable Approach

```
src/
  features/
    auth/
      components/
        LoginForm.tsx
        SignupForm.tsx
        PasswordReset.tsx
      hooks/
        useAuth.ts
        useSession.ts
      services/
        authService.ts
        tokenService.ts
      types/
        auth.types.ts
      utils/
        validation.ts
      index.ts

    incidents/
      components/
        IncidentList/
          IncidentList.tsx
          IncidentList.test.tsx
          IncidentList.styles.ts
          index.ts
        IncidentDetail/
          IncidentDetail.tsx
          IncidentTimeline.tsx
          IncidentActions.tsx
          index.ts
        IncidentForm/
          IncidentForm.tsx
          IncidentFormFields.tsx
          index.ts
      hooks/
        useIncidents.ts
        useIncidentDetail.ts
        useIncidentMutations.ts
      services/
        incidentService.ts
        incidentApi.ts
      store/
        incidentSlice.ts
        incidentSelectors.ts
      types/
        incident.types.ts
      constants/
        incidentStatus.ts
      utils/
        incidentFilters.ts
        incidentSorters.ts
      index.ts

    monitoring/
      components/
        MonitorList/
        MonitorDetail/
        MonitorForm/
        StatusIndicator/
      hooks/
        useMonitors.ts
        useMonitorStatus.ts
      services/
        monitorService.ts
      types/
        monitor.types.ts
      index.ts

    team/
      components/
        TeamList/
        TeamMember/
        InviteModal/
      hooks/
        useTeam.ts
        useInvitations.ts
      services/
        teamService.ts
      types/
        team.types.ts
      index.ts

  shared/
    components/
      Button/
      Modal/
      Table/
      Form/
      Layout/
    hooks/
      useDebounce.ts
      useLocalStorage.ts
      useMediaQuery.ts
    utils/
      formatters.ts
      validators.ts
      dateUtils.ts
    types/
      common.types.ts
      api.types.ts
    constants/
      routes.ts
      config.ts

  app/
    App.tsx
    Router.tsx
    Providers.tsx

  styles/
    theme.ts
    globalStyles.ts
    variables.ts
```

## 2. The Module Boundary Pattern

Each feature should expose a clean public API through its `index.ts` file. Internal implementation details stay private.

### Feature Index File

```typescript
// src/features/incidents/index.ts

// Public components
export { IncidentList } from './components/IncidentList';
export { IncidentDetail } from './components/IncidentDetail';
export { IncidentForm } from './components/IncidentForm';

// Public hooks
export { useIncidents } from './hooks/useIncidents';
export { useIncidentDetail } from './hooks/useIncidentDetail';
export { useIncidentMutations } from './hooks/useIncidentMutations';

// Public types
export type {
  Incident,
  IncidentStatus,
  IncidentSeverity,
  CreateIncidentPayload,
  UpdateIncidentPayload
} from './types/incident.types';

// Public constants
export { INCIDENT_STATUSES, INCIDENT_SEVERITIES } from './constants/incidentStatus';

// Note: services, internal components, and utilities are NOT exported
// They remain implementation details of this feature
```

### Consuming Features Cleanly

```typescript
// src/features/dashboard/components/DashboardOverview.tsx

// Good: Import from the feature's public API
import { IncidentList, useIncidents, type Incident } from '@/features/incidents';

// Bad: Reaching into internal implementation
import { IncidentList } from '@/features/incidents/components/IncidentList/IncidentList';
import { incidentFilters } from '@/features/incidents/utils/incidentFilters';
```

### ESLint Rule to Enforce Boundaries

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/features/*/components/*', '@/features/*/hooks/*', '@/features/*/services/*'],
            message: 'Import from the feature index instead: @/features/featureName'
          }
        ]
      }
    ]
  }
};
```

## 3. Component Organization Patterns

### The Component Folder Pattern

For non-trivial components, use a folder structure that keeps related files together:

```
IncidentList/
  IncidentList.tsx          # Main component
  IncidentList.test.tsx     # Tests
  IncidentList.stories.tsx  # Storybook stories
  IncidentList.styles.ts    # Styled components or CSS modules
  IncidentListItem.tsx      # Sub-component (if only used here)
  IncidentListHeader.tsx    # Sub-component
  useIncidentListState.ts   # Local hook (if only used here)
  index.ts                  # Re-exports the main component
```

### Component Index File

```typescript
// src/features/incidents/components/IncidentList/index.ts

export { IncidentList } from './IncidentList';
export type { IncidentListProps } from './IncidentList';
```

### Main Component Structure

```typescript
// src/features/incidents/components/IncidentList/IncidentList.tsx

import React, { useMemo, useCallback } from 'react';
import { useIncidents } from '../../hooks/useIncidents';
import { IncidentListItem } from './IncidentListItem';
import { IncidentListHeader } from './IncidentListHeader';
import {
  Container,
  ListWrapper,
  EmptyState,
  LoadingState
} from './IncidentList.styles';
import type { Incident, IncidentStatus } from '../../types/incident.types';

export interface IncidentListProps {
  projectId: string;
  statusFilter?: IncidentStatus[];
  onIncidentClick?: (incident: Incident) => void;
  maxItems?: number;
}

export const IncidentList: React.FC<IncidentListProps> = ({
  projectId,
  statusFilter,
  onIncidentClick,
  maxItems = 50
}) => {
  const {
    incidents,
    isLoading,
    error,
    refetch
  } = useIncidents(projectId, { statusFilter, limit: maxItems });

  const sortedIncidents = useMemo(() => {
    return [...incidents].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [incidents]);

  const handleItemClick = useCallback((incident: Incident) => {
    onIncidentClick?.(incident);
  }, [onIncidentClick]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <EmptyState>
        <p>Failed to load incidents</p>
        <button onClick={() => refetch()}>Retry</button>
      </EmptyState>
    );
  }

  if (sortedIncidents.length === 0) {
    return (
      <EmptyState>
        <p>No incidents found</p>
      </EmptyState>
    );
  }

  return (
    <Container>
      <IncidentListHeader count={sortedIncidents.length} />
      <ListWrapper>
        {sortedIncidents.map((incident) => (
          <IncidentListItem
            key={incident.id}
            incident={incident}
            onClick={handleItemClick}
          />
        ))}
      </ListWrapper>
    </Container>
  );
};
```

## 4. State Management Architecture

For large applications, you need a clear strategy for different types of state.

### State Categories

```
src/
  features/
    incidents/
      store/
        incidentSlice.ts       # Global incident state (Redux/Zustand)
        incidentSelectors.ts   # Memoized selectors
      hooks/
        useIncidents.ts        # Server state (React Query/SWR)
        useIncidentForm.ts     # Local form state
```

### Server State with React Query

```typescript
// src/features/incidents/hooks/useIncidents.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { incidentService } from '../services/incidentService';
import type {
  Incident,
  IncidentFilters,
  CreateIncidentPayload
} from '../types/incident.types';

const INCIDENTS_KEY = 'incidents';

export function useIncidents(projectId: string, filters?: IncidentFilters) {
  return useQuery({
    queryKey: [INCIDENTS_KEY, projectId, filters],
    queryFn: () => incidentService.getIncidents(projectId, filters),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useIncidentDetail(incidentId: string) {
  return useQuery({
    queryKey: [INCIDENTS_KEY, 'detail', incidentId],
    queryFn: () => incidentService.getIncidentById(incidentId),
    enabled: Boolean(incidentId),
  });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateIncidentPayload) =>
      incidentService.createIncident(payload),
    onSuccess: (newIncident) => {
      // Invalidate and refetch incidents list
      queryClient.invalidateQueries({ queryKey: [INCIDENTS_KEY] });
    },
  });
}

export function useUpdateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Incident> }) =>
      incidentService.updateIncident(id, payload),
    onSuccess: (updatedIncident, { id }) => {
      // Update the specific incident in cache
      queryClient.setQueryData(
        [INCIDENTS_KEY, 'detail', id],
        updatedIncident
      );
      // Invalidate list to refetch
      queryClient.invalidateQueries({
        queryKey: [INCIDENTS_KEY],
        exact: false
      });
    },
  });
}
```

### Global UI State with Zustand

```typescript
// src/features/incidents/store/incidentUiStore.ts

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface IncidentUiState {
  selectedIncidentId: string | null;
  isDetailPanelOpen: boolean;
  filterPanelExpanded: boolean;
  viewMode: 'list' | 'timeline' | 'kanban';

  // Actions
  selectIncident: (id: string | null) => void;
  toggleDetailPanel: () => void;
  toggleFilterPanel: () => void;
  setViewMode: (mode: 'list' | 'timeline' | 'kanban') => void;
  reset: () => void;
}

const initialState = {
  selectedIncidentId: null,
  isDetailPanelOpen: false,
  filterPanelExpanded: false,
  viewMode: 'list' as const,
};

export const useIncidentUiStore = create<IncidentUiState>()(
  devtools(
    (set) => ({
      ...initialState,

      selectIncident: (id) => set({
        selectedIncidentId: id,
        isDetailPanelOpen: id !== null
      }),

      toggleDetailPanel: () => set((state) => ({
        isDetailPanelOpen: !state.isDetailPanelOpen
      })),

      toggleFilterPanel: () => set((state) => ({
        filterPanelExpanded: !state.filterPanelExpanded
      })),

      setViewMode: (mode) => set({ viewMode: mode }),

      reset: () => set(initialState),
    }),
    { name: 'incident-ui-store' }
  )
);
```

### Form State with React Hook Form

```typescript
// src/features/incidents/hooks/useIncidentForm.ts

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateIncident, useUpdateIncident } from './useIncidents';

const incidentFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional(),
  severity: z.enum(['critical', 'major', 'minor', 'informational']),
  affectedServices: z.array(z.string()).min(1, 'Select at least one service'),
  assigneeId: z.string().optional(),
});

type IncidentFormData = z.infer<typeof incidentFormSchema>;

interface UseIncidentFormOptions {
  incidentId?: string;
  defaultValues?: Partial<IncidentFormData>;
  onSuccess?: () => void;
}

export function useIncidentForm(options: UseIncidentFormOptions = {}) {
  const { incidentId, defaultValues, onSuccess } = options;
  const isEditing = Boolean(incidentId);

  const createIncident = useCreateIncident();
  const updateIncident = useUpdateIncident();

  const form = useForm<IncidentFormData>({
    resolver: zodResolver(incidentFormSchema),
    defaultValues: {
      title: '',
      description: '',
      severity: 'minor',
      affectedServices: [],
      assigneeId: undefined,
      ...defaultValues,
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      if (isEditing && incidentId) {
        await updateIncident.mutateAsync({ id: incidentId, payload: data });
      } else {
        await createIncident.mutateAsync(data);
      }
      onSuccess?.();
    } catch (error) {
      // Error handling is managed by React Query
      console.error('Form submission failed:', error);
    }
  });

  return {
    form,
    onSubmit,
    isSubmitting: createIncident.isPending || updateIncident.isPending,
    isEditing,
  };
}
```

## 5. Type System Architecture

### Domain Types

```typescript
// src/features/incidents/types/incident.types.ts

// Base entity type
export interface Incident {
  id: string;
  title: string;
  description: string | null;
  status: IncidentStatus;
  severity: IncidentSeverity;
  affectedServices: string[];
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  acknowledgedAt: string | null;
  projectId: string;
}

// Enums as union types for better type inference
export type IncidentStatus =
  | 'identified'
  | 'investigating'
  | 'monitoring'
  | 'resolved';

export type IncidentSeverity =
  | 'critical'
  | 'major'
  | 'minor'
  | 'informational';

// API payload types
export interface CreateIncidentPayload {
  title: string;
  description?: string;
  severity: IncidentSeverity;
  affectedServices: string[];
  assigneeId?: string;
  projectId: string;
}

export interface UpdateIncidentPayload {
  title?: string;
  description?: string;
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  affectedServices?: string[];
  assigneeId?: string | null;
}

// Filter types
export interface IncidentFilters {
  statusFilter?: IncidentStatus[];
  severityFilter?: IncidentSeverity[];
  assigneeId?: string;
  search?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  limit?: number;
  offset?: number;
}

// API response types
export interface IncidentListResponse {
  data: Incident[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
```

### Shared API Types

```typescript
// src/shared/types/api.types.ts

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  statusCode: number;
}

// Generic query params
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface SortParams<T extends string = string> {
  sortBy?: T;
  sortOrder?: 'asc' | 'desc';
}
```

## 6. Service Layer Architecture

### API Service Pattern

```typescript
// src/features/incidents/services/incidentService.ts

import { apiClient } from '@/shared/services/apiClient';
import type {
  Incident,
  IncidentFilters,
  CreateIncidentPayload,
  UpdateIncidentPayload,
  IncidentListResponse,
} from '../types/incident.types';

const INCIDENTS_ENDPOINT = '/api/v1/incidents';

export const incidentService = {
  async getIncidents(
    projectId: string,
    filters?: IncidentFilters
  ): Promise<Incident[]> {
    const params = new URLSearchParams({
      projectId,
      ...(filters?.limit && { limit: String(filters.limit) }),
      ...(filters?.offset && { offset: String(filters.offset) }),
      ...(filters?.search && { search: filters.search }),
      ...(filters?.assigneeId && { assigneeId: filters.assigneeId }),
    });

    if (filters?.statusFilter?.length) {
      filters.statusFilter.forEach((status) => {
        params.append('status', status);
      });
    }

    if (filters?.severityFilter?.length) {
      filters.severityFilter.forEach((severity) => {
        params.append('severity', severity);
      });
    }

    const response = await apiClient.get<IncidentListResponse>(
      `${INCIDENTS_ENDPOINT}?${params.toString()}`
    );

    return response.data;
  },

  async getIncidentById(id: string): Promise<Incident> {
    const response = await apiClient.get<Incident>(
      `${INCIDENTS_ENDPOINT}/${id}`
    );
    return response;
  },

  async createIncident(payload: CreateIncidentPayload): Promise<Incident> {
    const response = await apiClient.post<Incident>(
      INCIDENTS_ENDPOINT,
      payload
    );
    return response;
  },

  async updateIncident(
    id: string,
    payload: UpdateIncidentPayload
  ): Promise<Incident> {
    const response = await apiClient.patch<Incident>(
      `${INCIDENTS_ENDPOINT}/${id}`,
      payload
    );
    return response;
  },

  async deleteIncident(id: string): Promise<void> {
    await apiClient.delete(`${INCIDENTS_ENDPOINT}/${id}`);
  },

  async acknowledgeIncident(id: string): Promise<Incident> {
    const response = await apiClient.post<Incident>(
      `${INCIDENTS_ENDPOINT}/${id}/acknowledge`
    );
    return response;
  },

  async resolveIncident(id: string, resolution?: string): Promise<Incident> {
    const response = await apiClient.post<Incident>(
      `${INCIDENTS_ENDPOINT}/${id}/resolve`,
      { resolution }
    );
    return response;
  },
};
```

### API Client Configuration

```typescript
// src/shared/services/apiClient.ts

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { getAuthToken, refreshToken, clearAuth } from '@/features/auth';
import type { ApiError } from '@/shared/types/api.types';

const BASE_URL = process.env.REACT_APP_API_URL || '/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 - attempt token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await refreshToken();
            return this.client(originalRequest);
          } catch (refreshError) {
            clearAuth();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        // Transform error to consistent format
        const apiError: ApiError = {
          code: error.response?.data?.code || 'UNKNOWN_ERROR',
          message: error.response?.data?.message || 'An unexpected error occurred',
          details: error.response?.data?.details,
          statusCode: error.response?.status || 500,
        };

        return Promise.reject(apiError);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
```

## 7. Routing Architecture

### Route Configuration

```typescript
// src/app/routes/routes.ts

export const ROUTES = {
  // Public routes
  LOGIN: '/login',
  SIGNUP: '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password/:token',

  // Dashboard
  DASHBOARD: '/dashboard',

  // Incidents
  INCIDENTS: '/incidents',
  INCIDENT_DETAIL: '/incidents/:incidentId',
  INCIDENT_CREATE: '/incidents/new',

  // Monitors
  MONITORS: '/monitors',
  MONITOR_DETAIL: '/monitors/:monitorId',
  MONITOR_CREATE: '/monitors/new',

  // Status Pages
  STATUS_PAGES: '/status-pages',
  STATUS_PAGE_DETAIL: '/status-pages/:statusPageId',

  // Team
  TEAM: '/team',
  TEAM_MEMBER: '/team/:memberId',

  // Settings
  SETTINGS: '/settings',
  SETTINGS_PROFILE: '/settings/profile',
  SETTINGS_NOTIFICATIONS: '/settings/notifications',
  SETTINGS_INTEGRATIONS: '/settings/integrations',
  SETTINGS_API_KEYS: '/settings/api-keys',
} as const;

// Type-safe route params
export type RouteParams = {
  [ROUTES.INCIDENT_DETAIL]: { incidentId: string };
  [ROUTES.MONITOR_DETAIL]: { monitorId: string };
  [ROUTES.STATUS_PAGE_DETAIL]: { statusPageId: string };
  [ROUTES.TEAM_MEMBER]: { memberId: string };
  [ROUTES.RESET_PASSWORD]: { token: string };
};

// Helper to build routes with params
export function buildRoute<T extends keyof RouteParams>(
  route: T,
  params: RouteParams[T]
): string {
  let path: string = route;
  Object.entries(params).forEach(([key, value]) => {
    path = path.replace(`:${key}`, value as string);
  });
  return path;
}
```

### Router Setup with Lazy Loading

```typescript
// src/app/Router.tsx

import React, { Suspense, lazy } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet
} from 'react-router-dom';
import { ROUTES } from './routes/routes';
import { AuthGuard } from '@/features/auth';
import { MainLayout } from '@/shared/components/Layout';
import { LoadingScreen } from '@/shared/components/LoadingScreen';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

// Lazy load feature pages
const Dashboard = lazy(() => import('@/features/dashboard/pages/Dashboard'));
const IncidentList = lazy(() => import('@/features/incidents/pages/IncidentListPage'));
const IncidentDetail = lazy(() => import('@/features/incidents/pages/IncidentDetailPage'));
const IncidentCreate = lazy(() => import('@/features/incidents/pages/IncidentCreatePage'));
const MonitorList = lazy(() => import('@/features/monitoring/pages/MonitorListPage'));
const MonitorDetail = lazy(() => import('@/features/monitoring/pages/MonitorDetailPage'));
const Settings = lazy(() => import('@/features/settings/pages/Settings'));
const Login = lazy(() => import('@/features/auth/pages/Login'));
const Signup = lazy(() => import('@/features/auth/pages/Signup'));

// Layout wrapper with suspense
const SuspenseLayout: React.FC = () => (
  <Suspense fallback={<LoadingScreen />}>
    <Outlet />
  </Suspense>
);

// Protected layout wrapper
const ProtectedLayout: React.FC = () => (
  <AuthGuard>
    <MainLayout>
      <SuspenseLayout />
    </MainLayout>
  </AuthGuard>
);

const router = createBrowserRouter([
  // Public routes
  {
    element: <SuspenseLayout />,
    children: [
      { path: ROUTES.LOGIN, element: <Login /> },
      { path: ROUTES.SIGNUP, element: <Signup /> },
    ],
  },

  // Protected routes
  {
    element: <ProtectedLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      { path: '/', element: <Navigate to={ROUTES.DASHBOARD} replace /> },
      { path: ROUTES.DASHBOARD, element: <Dashboard /> },

      // Incidents
      { path: ROUTES.INCIDENTS, element: <IncidentList /> },
      { path: ROUTES.INCIDENT_CREATE, element: <IncidentCreate /> },
      { path: ROUTES.INCIDENT_DETAIL, element: <IncidentDetail /> },

      // Monitors
      { path: ROUTES.MONITORS, element: <MonitorList /> },
      { path: ROUTES.MONITOR_DETAIL, element: <MonitorDetail /> },

      // Settings
      { path: ROUTES.SETTINGS, element: <Settings /> },
      { path: `${ROUTES.SETTINGS}/*`, element: <Settings /> },
    ],
  },

  // Catch-all
  { path: '*', element: <Navigate to={ROUTES.DASHBOARD} replace /> },
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};
```

## 8. Testing Architecture

### Test File Organization

```
src/
  features/
    incidents/
      components/
        IncidentList/
          IncidentList.tsx
          IncidentList.test.tsx        # Unit/integration tests
          IncidentList.stories.tsx     # Storybook stories
      hooks/
        useIncidents.ts
        useIncidents.test.ts           # Hook tests
      services/
        incidentService.ts
        incidentService.test.ts        # Service tests
      __mocks__/
        incidentMocks.ts               # Shared test fixtures

  __tests__/
    e2e/
      incidents.spec.ts                # E2E tests (Playwright/Cypress)
    integration/
      incidentFlow.test.tsx            # Cross-feature integration tests
```

### Test Utilities Setup

```typescript
// src/shared/test-utils/testUtils.tsx

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';

// Create a fresh query client for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
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

interface WrapperProps {
  children: React.ReactNode;
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  initialRoute?: string;
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const {
    queryClient = createTestQueryClient(),
    initialRoute = '/',
    ...renderOptions
  } = options;

  window.history.pushState({}, 'Test page', initialRoute);

  function Wrapper({ children }: WrapperProps) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { renderWithProviders as render };
```

### Component Test Example

```typescript
// src/features/incidents/components/IncidentList/IncidentList.test.tsx

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { render } from '@/shared/test-utils/testUtils';
import { IncidentList } from './IncidentList';
import { mockIncidents } from '../../__mocks__/incidentMocks';

const server = setupServer(
  rest.get('/api/v1/incidents', (req, res, ctx) => {
    return res(ctx.json({ data: mockIncidents, total: mockIncidents.length }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('IncidentList', () => {
  it('renders loading state initially', () => {
    render(<IncidentList projectId="project-1" />);

    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
  });

  it('renders incidents after loading', async () => {
    render(<IncidentList projectId="project-1" />);

    await waitFor(() => {
      expect(screen.getByText(mockIncidents[0].title)).toBeInTheDocument();
    });

    expect(screen.getAllByTestId('incident-item')).toHaveLength(mockIncidents.length);
  });

  it('calls onIncidentClick when an incident is clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <IncidentList
        projectId="project-1"
        onIncidentClick={handleClick}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(mockIncidents[0].title)).toBeInTheDocument();
    });

    await user.click(screen.getByText(mockIncidents[0].title));

    expect(handleClick).toHaveBeenCalledWith(mockIncidents[0]);
  });

  it('renders empty state when no incidents', async () => {
    server.use(
      rest.get('/api/v1/incidents', (req, res, ctx) => {
        return res(ctx.json({ data: [], total: 0 }));
      })
    );

    render(<IncidentList projectId="project-1" />);

    await waitFor(() => {
      expect(screen.getByText('No incidents found')).toBeInTheDocument();
    });
  });

  it('renders error state and retry button on failure', async () => {
    server.use(
      rest.get('/api/v1/incidents', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    render(<IncidentList projectId="project-1" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load incidents')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
```

## 9. Error Handling Patterns

### Global Error Boundary

```typescript
// src/shared/components/ErrorBoundary/ErrorBoundary.tsx

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logError } from '@/shared/services/errorService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logError(error, { componentStack: errorInfo.componentStack });
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>We have been notified and are working on a fix.</p>
          <button onClick={this.handleReset}>Try Again</button>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### API Error Handling Hook

```typescript
// src/shared/hooks/useApiError.ts

import { useCallback } from 'react';
import { useToast } from '@/shared/hooks/useToast';
import type { ApiError } from '@/shared/types/api.types';

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  RATE_LIMITED: 'Too many requests. Please wait and try again.',
  SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
};

export function useApiError() {
  const { showToast } = useToast();

  const handleError = useCallback((error: unknown) => {
    const apiError = error as ApiError;

    const message =
      ERROR_MESSAGES[apiError.code] ||
      apiError.message ||
      'An unexpected error occurred';

    showToast({
      type: 'error',
      title: 'Error',
      message,
      duration: 5000,
    });

    // Return the error for further handling if needed
    return apiError;
  }, [showToast]);

  return { handleError };
}
```

## 10. Performance Optimization Patterns

### Code Splitting by Route

```typescript
// Automatic code splitting with React.lazy
const IncidentDetail = lazy(() =>
  import('@/features/incidents/pages/IncidentDetailPage')
);

// Named export splitting
const IncidentForm = lazy(() =>
  import('@/features/incidents/components/IncidentForm').then(module => ({
    default: module.IncidentForm
  }))
);
```

### Memoization Patterns

```typescript
// src/features/incidents/components/IncidentFilters/IncidentFilters.tsx

import React, { memo, useMemo, useCallback } from 'react';
import type { IncidentFilters as Filters } from '../../types/incident.types';

interface IncidentFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  availableStatuses: string[];
  availableSeverities: string[];
}

// Memoize the entire component
export const IncidentFilters = memo<IncidentFiltersProps>(({
  filters,
  onFiltersChange,
  availableStatuses,
  availableSeverities
}) => {
  // Memoize derived data
  const statusOptions = useMemo(() =>
    availableStatuses.map(status => ({
      value: status,
      label: status.charAt(0).toUpperCase() + status.slice(1)
    })),
    [availableStatuses]
  );

  // Memoize callbacks
  const handleStatusChange = useCallback((status: string[]) => {
    onFiltersChange({ ...filters, statusFilter: status });
  }, [filters, onFiltersChange]);

  const handleSeverityChange = useCallback((severity: string[]) => {
    onFiltersChange({ ...filters, severityFilter: severity });
  }, [filters, onFiltersChange]);

  const handleClearFilters = useCallback(() => {
    onFiltersChange({});
  }, [onFiltersChange]);

  return (
    <div className="incident-filters">
      {/* Filter UI */}
    </div>
  );
});

IncidentFilters.displayName = 'IncidentFilters';
```

### Virtual List for Large Data Sets

```typescript
// src/features/incidents/components/IncidentVirtualList/IncidentVirtualList.tsx

import React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { IncidentListItem } from '../IncidentList/IncidentListItem';
import type { Incident } from '../../types/incident.types';

interface IncidentVirtualListProps {
  incidents: Incident[];
  onIncidentClick: (incident: Incident) => void;
  estimatedItemHeight?: number;
}

export const IncidentVirtualList: React.FC<IncidentVirtualListProps> = ({
  incidents,
  onIncidentClick,
  estimatedItemHeight = 72,
}) => {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: incidents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedItemHeight,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      style={{ height: '600px', overflow: 'auto' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <IncidentListItem
              incident={incidents[virtualItem.index]}
              onClick={onIncidentClick}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Summary: Architecture Decision Matrix

| Decision Area | Small App (< 20 components) | Medium App (20-100 components) | Large App (100+ components) |
|---------------|----------------------------|-------------------------------|---------------------------|
| **Folder Structure** | Type-based (components/, hooks/) | Feature-based with shared/ | Feature-based with strict module boundaries |
| **State Management** | React Context + useState | React Query + Zustand | React Query + Zustand + feature-scoped stores |
| **Routing** | Single routes file | Route config per feature | Lazy-loaded route modules |
| **Type Safety** | Basic TypeScript | Zod schemas + generated types | Full type coverage + API type generation |
| **Testing** | Component tests | Component + hook + service tests | Full pyramid + E2E + visual regression |
| **Code Splitting** | None needed | Route-based splitting | Route + feature + component splitting |
| **API Layer** | fetch/axios directly | Centralized API client | Service layer + React Query |
| **Error Handling** | try/catch in components | Error boundary + toast hooks | Global error boundary + error tracking |

## Key Takeaways

1. **Organize by feature, not by type.** When a developer needs to work on incidents, everything they need should be in one place.

2. **Enforce module boundaries.** Each feature exposes a public API through its index file. Internal implementation stays private.

3. **Separate state by concern.** Server state (React Query), global UI state (Zustand), and local form state (React Hook Form) each have their place.

4. **Colocate tests with code.** Tests live next to the code they test, making it easy to find and maintain them.

5. **Lazy load aggressively.** Every route and heavy component should be code-split to keep initial bundle size small.

6. **Type everything.** Domain types, API payloads, and component props should all be explicitly typed.

7. **Centralize API communication.** A single API client handles authentication, error transformation, and retry logic.

8. **Plan for scale from day one.** Refactoring folder structure is expensive. Start with feature-based organization even for smaller apps.

The goal is not to follow every pattern blindly, but to understand the trade-offs and choose the right level of structure for your team and project. A well-structured codebase is one where developers can find what they need quickly, make changes confidently, and ship features without fear.

---

Building maintainable React applications at scale requires discipline, but the payoff is enormous. Teams move faster, bugs are easier to track down, and new developers become productive in days instead of weeks. Start with clear boundaries, enforce them with tooling, and continuously refactor as your understanding of the domain evolves.
