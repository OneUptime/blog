# How to Fix 'Hydration Mismatch' Errors in SSR

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: React, SSR, Hydration, Next.js, Server-Side Rendering, Debugging, TypeScript, Performance

Description: Learn how to identify, debug, and fix hydration mismatch errors that occur when server-rendered HTML differs from client-rendered output.

---

Hydration mismatch errors occur when server-rendered HTML differs from client-rendered output. This guide explains causes and solutions.

## What Is Hydration?

```mermaid
sequenceDiagram
    Server->>Browser: Send HTML
    Browser->>React: Load JavaScript
    React->>Browser: Compare virtual DOM with HTML
    alt Match
        React->>Browser: Attach event handlers
    else Mismatch
        React->>Browser: Hydration error
    end
```

## Common Causes and Fixes

### Browser-Only APIs

```tsx
// BAD: window undefined on server
function BadComponent() {
  const width = window.innerWidth;
  return <div>Width: {width}</div>;
}

// GOOD: Use useEffect
import { useState, useEffect } from 'react';

function GoodComponent() {
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    setWidth(window.innerWidth);
  }, []);

  if (width === null) return <div>Loading...</div>;
  return <div>Width: {width}</div>;
}
```

### Random Values

```tsx
// BAD: Different on server vs client
function BadComponent() {
  const id = Math.random().toString();
  return <label htmlFor={id}>Name</label>;
}

// GOOD: Use useId
import { useId } from 'react';

function GoodComponent() {
  const id = useId();
  return <label htmlFor={id}>Name</label>;
}
```

### Date/Time Differences

```tsx
// BAD
function BadComponent() {
  const now = new Date().toISOString();
  return <time>{now}</time>;
}

// GOOD
import { useState, useEffect } from 'react';

function GoodComponent() {
  const [timestamp, setTimestamp] = useState('');

  useEffect(() => {
    setTimestamp(new Date().toISOString());
  }, []);

  return <time>{timestamp}</time>;
}
```

## Client-Only Component Pattern

```tsx
'use client';

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';

function ClientOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return fallback;
  return <>{children}</>;
}
```

## Decision Flow

```mermaid
flowchart TD
    A[Hydration Error] --> B{What type?}
    B -->|Browser API| C[Use useEffect]
    B -->|Random value| D[Use useId]
    B -->|Date/Time| E[Use useEffect]
    B -->|User data| F[Fetch in useEffect]
```

## Summary

| Cause | Solution |
|-------|----------|
| Browser APIs | Use useEffect |
| Random IDs | Use useId hook |
| Date/time | Pass from server or useEffect |
| localStorage | Defer to useEffect |

The key principle is ensuring initial client render matches server output.
