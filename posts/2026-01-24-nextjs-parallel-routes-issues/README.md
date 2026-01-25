# How to Fix Parallel Routes Issues in Next.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Next.js, Parallel Routes, App Router, Routing, Layouts, Modals

Description: A troubleshooting guide for common parallel routes issues in Next.js, covering slot matching, default pages, and modal patterns.

---

Parallel Routes in Next.js allow you to render multiple pages simultaneously in the same layout. While powerful, they come with specific rules and common pitfalls that can cause unexpected behavior.

## Understanding Parallel Routes

Parallel routes use named slots defined with the `@` prefix. Each slot can have its own loading, error, and page states.

```mermaid
flowchart TD
    subgraph Layout
        L[layout.tsx]
    end

    subgraph Slots
        M[@modal]
        S[@sidebar]
        C[children - default]
    end

    subgraph "Rendered Pages"
        MP[Modal Page]
        SP[Sidebar Page]
        CP[Main Content]
    end

    L --> M
    L --> S
    L --> C

    M --> MP
    S --> SP
    C --> CP
```

## Basic Parallel Routes Setup

```
app/
  layout.tsx
  page.tsx
  @modal/
    page.tsx
    default.tsx
  @sidebar/
    page.tsx
    default.tsx
```

```typescript
// app/layout.tsx
interface LayoutProps {
  children: React.ReactNode;
  modal: React.ReactNode;
  sidebar: React.ReactNode;
}

export default function RootLayout({ children, modal, sidebar }: LayoutProps) {
  return (
    <html>
      <body>
        <div className="layout">
          <aside className="sidebar-container">
            {sidebar}
          </aside>
          <main className="main-content">
            {children}
          </main>
          {modal}
        </div>
      </body>
    </html>
  );
}
```

## Issue 1: Slot Not Rendering (Missing default.tsx)

The most common issue is slots not rendering because Next.js cannot match the current URL to a page in that slot.

### Problem

```
app/
  layout.tsx
  page.tsx           # Renders at /
  @modal/
    photo/
      [id]/
        page.tsx     # Renders at /photo/[id]
```

When you navigate to `/`, the `@modal` slot has no page to render because there is no `page.tsx` or `default.tsx` at that level.

### Solution: Add default.tsx files

```typescript
// app/@modal/default.tsx
// Return null when no modal should be shown
export default function ModalDefault() {
  return null;
}
```

```typescript
// app/@modal/photo/default.tsx
// Also needed for nested routes
export default function PhotoModalDefault() {
  return null;
}
```

```mermaid
flowchart TD
    subgraph "URL: /"
        R1[/]
        D1[default.tsx renders null]
    end

    subgraph "URL: /photo/123"
        R2[/photo/123]
        P1[page.tsx renders modal]
    end

    R1 --> D1
    R2 --> P1
```

## Issue 2: Parallel Route Not Updating on Navigation

Soft navigation (client-side) preserves the current slot state, which can cause confusion.

### Problem

```typescript
// When navigating from /photo/1 to / using Link,
// the modal might still show because of soft navigation
```

### Solution: Use router.refresh() or hard navigation

```typescript
// components/CloseModal.tsx
'use client';

import { useRouter } from 'next/navigation';

export function CloseModal() {
  const router = useRouter();

  const handleClose = () => {
    // Option 1: Go back in history
    router.back();

    // Option 2: Navigate and refresh
    // router.push('/');
    // router.refresh();
  };

  return (
    <button onClick={handleClose}>
      Close Modal
    </button>
  );
}
```

## Issue 3: Intercepting Routes with Parallel Routes

When combining intercepting routes with parallel routes for modals, the setup can be tricky.

### File Structure for Modal Pattern

```
app/
  layout.tsx
  page.tsx
  @modal/
    (.)photo/
      [id]/
        page.tsx      # Intercepted route - shows modal
    default.tsx
  photo/
    [id]/
      page.tsx        # Direct route - shows full page
```

```mermaid
flowchart TD
    subgraph "Soft Navigation from /"
        SN[Click Link to /photo/123]
        INT[(.)photo/[id]/page.tsx]
        MODAL[Shows Modal]
    end

    subgraph "Direct Navigation"
        DN[Enter URL /photo/123]
        FULL[photo/[id]/page.tsx]
        PAGE[Shows Full Page]
    end

    SN --> INT
    INT --> MODAL

    DN --> FULL
    FULL --> PAGE
```

### Implementation

```typescript
// app/@modal/(.)photo/[id]/page.tsx
// This intercepts soft navigation to /photo/[id]
import { PhotoModal } from '@/components/PhotoModal';

interface ModalPageProps {
  params: { id: string };
}

export default function PhotoModalPage({ params }: ModalPageProps) {
  return <PhotoModal photoId={params.id} />;
}
```

```typescript
// app/photo/[id]/page.tsx
// This handles direct navigation to /photo/[id]
import { PhotoFullPage } from '@/components/PhotoFullPage';

interface PhotoPageProps {
  params: { id: string };
}

export default function PhotoPage({ params }: PhotoPageProps) {
  return <PhotoFullPage photoId={params.id} />;
}
```

```typescript
// components/PhotoModal.tsx
'use client';

import { useRouter } from 'next/navigation';

interface PhotoModalProps {
  photoId: string;
}

export function PhotoModal({ photoId }: PhotoModalProps) {
  const router = useRouter();

  return (
    <div className="modal-overlay" onClick={() => router.back()}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <img src={`/api/photos/${photoId}`} alt="Photo" />
        <button onClick={() => router.back()}>Close</button>
      </div>
    </div>
  );
}
```

## Issue 4: Slot Props Not Passed to Layout

Make sure your layout component accepts all slot props.

### Problem

```typescript
// app/layout.tsx
// Missing the modal prop
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
// The @modal slot is ignored!
```

### Solution

```typescript
// app/layout.tsx
interface LayoutProps {
  children: React.ReactNode;
  modal: React.ReactNode;  // Must match @modal folder name
}

export default function Layout({ children, modal }: LayoutProps) {
  return (
    <html>
      <body>
        {children}
        {modal}
      </body>
    </html>
  );
}
```

## Issue 5: Loading and Error States for Slots

Each slot can have its own loading and error handling.

```
app/
  @sidebar/
    loading.tsx     # Loading state for sidebar
    error.tsx       # Error state for sidebar
    page.tsx
  @modal/
    loading.tsx     # Loading state for modal
    error.tsx       # Error state for modal
    page.tsx
```

```typescript
// app/@sidebar/loading.tsx
export default function SidebarLoading() {
  return (
    <div className="sidebar-skeleton">
      <div className="skeleton-item" />
      <div className="skeleton-item" />
      <div className="skeleton-item" />
    </div>
  );
}
```

```typescript
// app/@sidebar/error.tsx
'use client';

export default function SidebarError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="sidebar-error">
      <p>Failed to load sidebar</p>
      <button onClick={reset}>Retry</button>
    </div>
  );
}
```

## Issue 6: Conditional Slot Rendering

Sometimes you want to conditionally render slots based on authentication or other conditions.

```typescript
// app/layout.tsx
import { auth } from '@/lib/auth';

interface LayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  modal: React.ReactNode;
}

export default async function Layout({ children, sidebar, modal }: LayoutProps) {
  const session = await auth();

  return (
    <html>
      <body>
        <div className="layout">
          {/* Only show sidebar if authenticated */}
          {session ? (
            <aside className="sidebar">
              {sidebar}
            </aside>
          ) : null}

          <main className="content">
            {children}
          </main>

          {modal}
        </div>
      </body>
    </html>
  );
}
```

## Issue 7: URL Mismatch Between Slots

Parallel routes must have matching URL structures across slots for proper navigation.

### Incorrect Structure

```
app/
  @sidebar/
    users/
      page.tsx        # /users
  @main/
    dashboard/
      page.tsx        # /dashboard (different URL!)
```

### Correct Structure

```
app/
  @sidebar/
    dashboard/
      page.tsx
    default.tsx
  page.tsx              # Main content at /dashboard
  dashboard/
    page.tsx
```

## Issue 8: Navigating Between Parallel Route States

```typescript
// components/Navigation.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav>
      {/* Regular navigation updates all slots */}
      <Link href="/dashboard">Dashboard</Link>
      <Link href="/settings">Settings</Link>

      {/* To update only one slot, use scroll={false} */}
      <Link href="/dashboard/stats" scroll={false}>
        View Stats
      </Link>
    </nav>
  );
}
```

## Complete Modal Pattern Example

Here is a complete implementation of the modal pattern with parallel and intercepting routes.

```
app/
  layout.tsx
  page.tsx
  @modal/
    (.)items/
      [id]/
        page.tsx
    default.tsx
  items/
    page.tsx
    [id]/
      page.tsx
```

```typescript
// app/layout.tsx
interface RootLayoutProps {
  children: React.ReactNode;
  modal: React.ReactNode;
}

export default function RootLayout({ children, modal }: RootLayoutProps) {
  return (
    <html>
      <body>
        {children}
        {modal}
      </body>
    </html>
  );
}
```

```typescript
// app/page.tsx
import Link from 'next/link';

export default function HomePage() {
  const items = [
    { id: 1, name: 'Item One' },
    { id: 2, name: 'Item Two' },
    { id: 3, name: 'Item Three' },
  ];

  return (
    <div>
      <h1>Home Page</h1>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <Link href={`/items/${item.id}`}>
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```typescript
// app/@modal/default.tsx
export default function ModalDefault() {
  return null;
}
```

```typescript
// app/@modal/(.)items/[id]/page.tsx
import { Modal } from '@/components/Modal';
import { getItem } from '@/lib/items';

interface ModalPageProps {
  params: { id: string };
}

export default async function ItemModal({ params }: ModalPageProps) {
  const item = await getItem(params.id);

  return (
    <Modal>
      <h2>{item.name}</h2>
      <p>{item.description}</p>
    </Modal>
  );
}
```

```typescript
// app/items/[id]/page.tsx
import { getItem } from '@/lib/items';

interface ItemPageProps {
  params: { id: string };
}

export default async function ItemPage({ params }: ItemPageProps) {
  const item = await getItem(params.id);

  return (
    <div className="item-full-page">
      <h1>{item.name}</h1>
      <p>{item.description}</p>
      {/* Full page content */}
    </div>
  );
}
```

```typescript
// components/Modal.tsx
'use client';

import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

interface ModalProps {
  children: ReactNode;
}

export function Modal({ children }: ModalProps) {
  const router = useRouter();

  return (
    <div
      className="modal-backdrop"
      onClick={() => router.back()}
    >
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close"
          onClick={() => router.back()}
        >
          X
        </button>
        {children}
      </div>
    </div>
  );
}
```

## Debugging Tips

1. Check that all slots have `default.tsx` files
2. Verify slot names match between folder names and layout props
3. Use browser dev tools to inspect the rendered component tree
4. Add console logs in each slot page to track which is rendering
5. Check the Network tab to see which routes are being fetched

## Summary

To fix parallel routes issues in Next.js:

1. Always add `default.tsx` files to handle unmatched URLs
2. Ensure layout props match all `@slot` folder names
3. Use `router.back()` for modal close behavior
4. Combine with intercepting routes `(.)` for modal patterns
5. Keep URL structures consistent across parallel slots
6. Add loading and error states per slot for better UX
7. Use `router.refresh()` when soft navigation causes stale states

Understanding how parallel routes match URLs and how soft navigation preserves slot state will help you build complex layouts with modals, sidebars, and other simultaneous views.
