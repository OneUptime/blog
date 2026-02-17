# How to Integrate Azure Application Insights with a React Frontend for Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Application Insights, React, Monitoring, Telemetry, Performance, Observability

Description: Add Azure Application Insights to a React application for frontend monitoring, error tracking, and performance analytics.

---

Your backend has monitoring. Your infrastructure has monitoring. But what about your frontend? Users experience slow page loads, JavaScript errors, and failed API calls that your server-side monitoring never sees. Azure Application Insights provides a JavaScript SDK that captures frontend telemetry - page views, exceptions, custom events, and performance metrics - and sends it all to the same place as your backend data. This gives you a complete picture of your application's health from the user's perspective.

This guide shows how to integrate Application Insights into a React application with custom event tracking, error boundaries, and performance monitoring.

## Prerequisites

- An Azure account
- A React application (we will create one)
- Node.js 18 or later
- Basic React knowledge

## Creating the Application Insights Resource

```bash
# Create a resource group
az group create --name monitoring-demo-rg --location eastus

# Create an Application Insights resource
az monitor app-insights component create \
  --app react-frontend-insights \
  --location eastus \
  --resource-group monitoring-demo-rg \
  --kind web \
  --application-type web

# Get the connection string
az monitor app-insights component show \
  --app react-frontend-insights \
  --resource-group monitoring-demo-rg \
  --query connectionString \
  --output tsv
```

## Setting Up the React Project

```bash
# Create a React app
npx create-react-app react-insights-demo --template typescript
cd react-insights-demo

# Install the Application Insights SDK
npm install @microsoft/applicationinsights-web @microsoft/applicationinsights-react-js
```

## Configuring Application Insights

Create a centralized configuration for the telemetry client:

```typescript
// src/telemetry/appInsights.ts - Application Insights configuration
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { ReactPlugin } from '@microsoft/applicationinsights-react-js';

// Create the React plugin for component tracking
const reactPlugin = new ReactPlugin();

// Initialize Application Insights
const appInsights = new ApplicationInsights({
  config: {
    // Your Application Insights connection string
    connectionString: process.env.REACT_APP_APPINSIGHTS_CONNECTION_STRING,
    // Extensions including the React plugin
    extensions: [reactPlugin],
    // Enable automatic tracking features
    enableAutoRouteTracking: true,
    // Track unhandled exceptions
    enableUnhandledPromiseRejectionTracking: true,
    // Disable telemetry in development if desired
    disableTelemetry: process.env.NODE_ENV === 'development',
    // Sample percentage (100 = all requests, 50 = half)
    samplingPercentage: 100,
    // Maximum number of AJAX calls tracked per page view
    maxAjaxCallsPerView: 50,
    // Track page visit duration
    autoTrackPageVisitTime: true,
  },
});

// Load the SDK and start collecting telemetry
appInsights.loadAppInsights();

// Track the initial page view
appInsights.trackPageView();

export { reactPlugin, appInsights };
```

## Integrating with React

Wrap your application with the Application Insights provider:

```typescript
// src/index.tsx - App entry point with telemetry
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppInsightsContext } from '@microsoft/applicationinsights-react-js';
import { reactPlugin } from './telemetry/appInsights';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <AppInsightsContext.Provider value={reactPlugin}>
      <App />
    </AppInsightsContext.Provider>
  </React.StrictMode>
);
```

## Tracking Custom Events

Custom events let you track business-specific actions that matter to your application:

```typescript
// src/hooks/useTracking.ts - Custom tracking hook
import { useCallback } from 'react';
import { appInsights } from '../telemetry/appInsights';

// Define event names as constants to prevent typos
export const TrackingEvents = {
  BUTTON_CLICK: 'ButtonClick',
  FORM_SUBMIT: 'FormSubmit',
  FEATURE_USED: 'FeatureUsed',
  SEARCH_PERFORMED: 'SearchPerformed',
  ITEM_ADDED_TO_CART: 'ItemAddedToCart',
  CHECKOUT_STARTED: 'CheckoutStarted',
  CHECKOUT_COMPLETED: 'CheckoutCompleted',
  ERROR_DISPLAYED: 'ErrorDisplayed',
} as const;

export function useTracking() {
  // Track a custom event with optional properties
  const trackEvent = useCallback(
    (name: string, properties?: Record<string, string>, measurements?: Record<string, number>) => {
      appInsights.trackEvent({ name }, { ...properties, ...measurements });
    },
    []
  );

  // Track a page view with custom name
  const trackPageView = useCallback((name: string, uri?: string) => {
    appInsights.trackPageView({ name, uri });
  }, []);

  // Track a metric value
  const trackMetric = useCallback((name: string, average: number) => {
    appInsights.trackMetric({ name, average });
  }, []);

  // Track an exception
  const trackException = useCallback((error: Error, properties?: Record<string, string>) => {
    appInsights.trackException({ exception: error }, properties);
  }, []);

  // Set the authenticated user context
  const setUser = useCallback((userId: string, accountId?: string) => {
    appInsights.setAuthenticatedUserContext(userId, accountId, true);
  }, []);

  // Clear user context on logout
  const clearUser = useCallback(() => {
    appInsights.clearAuthenticatedUserContext();
  }, []);

  return {
    trackEvent,
    trackPageView,
    trackMetric,
    trackException,
    setUser,
    clearUser,
  };
}
```

Use the tracking hook in your components:

```typescript
// src/components/SearchBar.tsx - Component with event tracking
import { useState } from 'react';
import { useTracking, TrackingEvents } from '../hooks/useTracking';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const { trackEvent } = useTracking();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Track the search event with the query length
    trackEvent(TrackingEvents.SEARCH_PERFORMED, {
      queryLength: String(query.length),
      hasFilters: 'false',
    });

    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      <button type="submit">Search</button>
    </form>
  );
}
```

## Error Boundary with Telemetry

Create an error boundary that reports uncaught React errors to Application Insights:

```typescript
// src/components/ErrorBoundary.tsx - Error boundary with telemetry
import React, { Component, ErrorInfo } from 'react';
import { appInsights } from '../telemetry/appInsights';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class TelemetryErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Report the error to Application Insights
    appInsights.trackException({
      exception: error,
      severityLevel: 3, // Error
      properties: {
        componentStack: errorInfo.componentStack || 'unknown',
        errorBoundary: 'TelemetryErrorBoundary',
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="error-fallback">
            <h2>Something went wrong</h2>
            <p>The error has been reported automatically.</p>
            <button onClick={() => this.setState({ hasError: false, error: null })}>
              Try again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

## Tracking Performance

Monitor component render performance and API call durations:

```typescript
// src/hooks/usePerformanceTracking.ts - Performance monitoring
import { useEffect, useRef } from 'react';
import { appInsights } from '../telemetry/appInsights';

// Track how long a component takes to mount
export function useComponentPerformance(componentName: string) {
  const startTime = useRef(performance.now());

  useEffect(() => {
    const duration = performance.now() - startTime.current;

    // Report component render time as a custom metric
    appInsights.trackMetric({
      name: `Component.${componentName}.RenderTime`,
      average: duration,
    });

    // Log a warning for slow components
    if (duration > 100) {
      appInsights.trackTrace({
        message: `Slow component render: ${componentName} took ${duration.toFixed(0)}ms`,
        severityLevel: 2, // Warning
      });
    }
  }, [componentName]);
}

// Track API call performance
export async function trackApiCall<T>(
  name: string,
  apiCall: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();

  try {
    const result = await apiCall();
    const duration = performance.now() - startTime;

    appInsights.trackDependencyData({
      id: `api-${Date.now()}`,
      name,
      duration,
      success: true,
      responseCode: 200,
      type: 'HTTP',
      target: name,
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    appInsights.trackDependencyData({
      id: `api-${Date.now()}`,
      name,
      duration,
      success: false,
      responseCode: 500,
      type: 'HTTP',
      target: name,
    });

    throw error;
  }
}
```

## Querying Telemetry Data

Once data flows in, you can query it in the Azure Portal using Kusto Query Language (KQL):

```
// Find the most common JavaScript errors
exceptions
| where timestamp > ago(24h)
| where client_Type == "Browser"
| summarize count() by problemId, outerMessage
| order by count_ desc
| take 20

// Track page load performance over time
pageViews
| where timestamp > ago(7d)
| summarize avg(duration), percentile(duration, 95) by bin(timestamp, 1h)
| render timechart

// Find slow API calls from the frontend
dependencies
| where timestamp > ago(24h)
| where client_Type == "Browser"
| where duration > 2000
| project timestamp, name, duration, success
| order by duration desc
```

## Environment Variable Setup

Create a `.env` file for local development:

```env
# Application Insights connection string
REACT_APP_APPINSIGHTS_CONNECTION_STRING="InstrumentationKey=xxx;IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/"
```

For production, set this value in your deployment pipeline or hosting platform configuration.

## Wrapping Up

Application Insights gives you visibility into what your users actually experience. Page load times, JavaScript errors, failed API calls, and custom business events all show up in a single dashboard. The React integration is lightweight - the SDK adds about 30KB gzipped to your bundle - and the telemetry it provides is invaluable for diagnosing issues that only happen in production. The custom event tracking hooks shown here make it easy to instrument your components without cluttering your business logic. Start with automatic tracking (page views, exceptions, and AJAX calls) and add custom events as you learn which metrics matter most for your application.
