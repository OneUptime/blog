# How to Implement Cypress Component Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cypress, Component Testing, React, Vue, Angular, Testing, TypeScript, Frontend, Test Automation

Description: A comprehensive guide to implementing Cypress component testing for React, Vue, and Angular applications, covering setup, mounting components, props, events, stubbing, and visual testing.

---

> Component testing bridges the gap between unit tests and end-to-end tests. It lets you test your UI components in isolation with real browser rendering, giving you the speed of unit tests with the confidence of integration tests.

Cypress component testing allows you to mount individual components directly in the browser, interact with them using Cypress commands, and verify their behavior without spinning up your entire application. This guide walks through setting up component testing for React, Vue, and Angular, with practical examples you can apply immediately.

---

## Table of Contents

1. Why Component Testing?
2. Setting Up Cypress Component Testing
3. Mounting Components with cy.mount()
4. Testing React Components
5. Testing Vue Components
6. Testing Angular Components
7. Working with Props and Events
8. Stubbing Dependencies
9. Visual Testing
10. Best Practices Summary

---

## 1. Why Component Testing?

Component testing fills a critical gap in the testing pyramid:

| Test Type | Speed | Confidence | Isolation |
|-----------|-------|------------|-----------|
| Unit Tests | Fast | Lower | High |
| Component Tests | Fast | Medium-High | Medium |
| E2E Tests | Slow | High | Low |

Benefits of Cypress component testing:
- Real browser rendering (not jsdom)
- Full Cypress API (cy.click(), cy.type(), assertions)
- Visual debugging with time-travel
- Network stubbing with cy.intercept()
- No application server required

---

## 2. Setting Up Cypress Component Testing

### Installation

First, install Cypress and the component testing dependencies:

```bash
# Install Cypress
npm install --save-dev cypress

# For React projects
npm install --save-dev @cypress/react

# For Vue projects
npm install --save-dev @cypress/vue

# For Angular projects
npm install --save-dev @cypress/angular
```

### Configuration

Run the Cypress launchpad to configure component testing:

```bash
npx cypress open
```

Select "Component Testing" and follow the wizard. Cypress will detect your framework and create the necessary configuration.

Alternatively, manually configure `cypress.config.ts`:

```typescript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  // E2E testing configuration (if needed)
  e2e: {
    baseUrl: 'http://localhost:3000',
  },

  // Component testing configuration
  component: {
    // The dev server to use (Vite, Webpack, etc.)
    devServer: {
      framework: 'react',      // 'react', 'vue', or 'angular'
      bundler: 'vite',         // 'vite' or 'webpack'
    },
    // Spec file pattern for component tests
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    // Where to find support files
    supportFile: 'cypress/support/component.ts',
  },
});
```

### Support File Setup

Create the component support file:

```typescript
// cypress/support/component.ts
import './commands';

// Import framework-specific mount command
// For React:
import { mount } from 'cypress/react18';

// For Vue:
// import { mount } from 'cypress/vue';

// For Angular:
// import { mount } from 'cypress/angular';

// Augment Cypress types with mount command
declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}

// Register the mount command
Cypress.Commands.add('mount', mount);
```

---

## 3. Mounting Components with cy.mount()

The `cy.mount()` command renders your component in isolation within the Cypress test runner.

### Basic Mounting

```typescript
// Button.cy.tsx
import Button from './Button';

describe('Button Component', () => {
  it('renders with default props', () => {
    // Mount the component
    cy.mount(<Button>Click me</Button>);

    // Assert the component rendered correctly
    cy.get('button').should('be.visible');
    cy.get('button').should('contain.text', 'Click me');
  });
});
```

### Mounting with Props

```typescript
// Card.cy.tsx
import Card from './Card';

describe('Card Component', () => {
  it('renders with title and description', () => {
    // Mount with props
    cy.mount(
      <Card
        title="Welcome"
        description="This is a card component"
        variant="primary"
      />
    );

    // Verify props are applied
    cy.get('[data-testid="card-title"]').should('have.text', 'Welcome');
    cy.get('[data-testid="card-description"]')
      .should('contain.text', 'This is a card component');
    cy.get('.card').should('have.class', 'card-primary');
  });
});
```

### Mounting with Providers and Context

```typescript
// ThemedButton.cy.tsx
import ThemedButton from './ThemedButton';
import { ThemeProvider } from './ThemeContext';

describe('ThemedButton Component', () => {
  it('renders with theme context', () => {
    // Wrap component with required providers
    cy.mount(
      <ThemeProvider theme="dark">
        <ThemedButton>Dark Mode Button</ThemedButton>
      </ThemeProvider>
    );

    cy.get('button').should('have.class', 'theme-dark');
  });
});
```

---

## 4. Testing React Components

### React Component Example

```tsx
// UserProfile.tsx
import React, { useState } from 'react';

interface UserProfileProps {
  username: string;
  email: string;
  onSave: (data: { username: string; email: string }) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  username,
  email,
  onSave,
}) => {
  const [formData, setFormData] = useState({ username, email });
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setIsEditing(false);
  };

  return (
    <div className="user-profile" data-testid="user-profile">
      {isEditing ? (
        <form onSubmit={handleSubmit} data-testid="edit-form">
          <input
            type="text"
            value={formData.username}
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
            }
            data-testid="username-input"
          />
          <input
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            data-testid="email-input"
          />
          <button type="submit" data-testid="save-button">
            Save
          </button>
        </form>
      ) : (
        <div data-testid="profile-display">
          <p data-testid="username-display">{formData.username}</p>
          <p data-testid="email-display">{formData.email}</p>
          <button
            onClick={() => setIsEditing(true)}
            data-testid="edit-button"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
};
```

### React Component Test

```tsx
// UserProfile.cy.tsx
import { UserProfile } from './UserProfile';

describe('UserProfile Component', () => {
  // Default props for testing
  const defaultProps = {
    username: 'johndoe',
    email: 'john@example.com',
    onSave: cy.stub().as('onSave'),
  };

  beforeEach(() => {
    // Reset stubs before each test
    defaultProps.onSave = cy.stub().as('onSave');
  });

  it('displays user information in read mode', () => {
    cy.mount(<UserProfile {...defaultProps} />);

    // Verify display mode
    cy.get('[data-testid="profile-display"]').should('be.visible');
    cy.get('[data-testid="username-display"]')
      .should('have.text', 'johndoe');
    cy.get('[data-testid="email-display"]')
      .should('have.text', 'john@example.com');
  });

  it('switches to edit mode when edit button is clicked', () => {
    cy.mount(<UserProfile {...defaultProps} />);

    // Click edit button
    cy.get('[data-testid="edit-button"]').click();

    // Verify edit form is visible
    cy.get('[data-testid="edit-form"]').should('be.visible');
    cy.get('[data-testid="username-input"]')
      .should('have.value', 'johndoe');
    cy.get('[data-testid="email-input"]')
      .should('have.value', 'john@example.com');
  });

  it('updates form values and calls onSave', () => {
    cy.mount(<UserProfile {...defaultProps} />);

    // Enter edit mode
    cy.get('[data-testid="edit-button"]').click();

    // Update values
    cy.get('[data-testid="username-input"]')
      .clear()
      .type('janedoe');
    cy.get('[data-testid="email-input"]')
      .clear()
      .type('jane@example.com');

    // Submit form
    cy.get('[data-testid="save-button"]').click();

    // Verify onSave was called with updated data
    cy.get('@onSave').should('have.been.calledOnceWith', {
      username: 'janedoe',
      email: 'jane@example.com',
    });

    // Verify returned to display mode
    cy.get('[data-testid="profile-display"]').should('be.visible');
  });
});
```

---

## 5. Testing Vue Components

### Vue Component Example

```vue
<!-- Counter.vue -->
<template>
  <div class="counter" data-testid="counter">
    <span data-testid="count-display">{{ count }}</span>
    <button
      @click="increment"
      data-testid="increment-button"
      :disabled="count >= max"
    >
      Increment
    </button>
    <button
      @click="decrement"
      data-testid="decrement-button"
      :disabled="count <= min"
    >
      Decrement
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  initialValue?: number;
  min?: number;
  max?: number;
}

const props = withDefaults(defineProps<Props>(), {
  initialValue: 0,
  min: 0,
  max: 10,
});

const emit = defineEmits<{
  (e: 'change', value: number): void;
}>();

const count = ref(props.initialValue);

const increment = () => {
  if (count.value < props.max) {
    count.value++;
    emit('change', count.value);
  }
};

const decrement = () => {
  if (count.value > props.min) {
    count.value--;
    emit('change', count.value);
  }
};

watch(count, (newValue) => {
  emit('change', newValue);
});
</script>
```

### Vue Component Test

```typescript
// Counter.cy.ts
import Counter from './Counter.vue';

describe('Counter Component', () => {
  it('renders with default initial value', () => {
    cy.mount(Counter);

    cy.get('[data-testid="count-display"]').should('have.text', '0');
  });

  it('renders with custom initial value', () => {
    cy.mount(Counter, {
      props: {
        initialValue: 5,
      },
    });

    cy.get('[data-testid="count-display"]').should('have.text', '5');
  });

  it('increments count when increment button is clicked', () => {
    const onChangeSpy = cy.spy().as('onChange');

    cy.mount(Counter, {
      props: {
        initialValue: 0,
        onChange: onChangeSpy,
      },
    });

    cy.get('[data-testid="increment-button"]').click();
    cy.get('[data-testid="count-display"]').should('have.text', '1');
  });

  it('decrements count when decrement button is clicked', () => {
    cy.mount(Counter, {
      props: {
        initialValue: 5,
      },
    });

    cy.get('[data-testid="decrement-button"]').click();
    cy.get('[data-testid="count-display"]').should('have.text', '4');
  });

  it('disables increment button at max value', () => {
    cy.mount(Counter, {
      props: {
        initialValue: 10,
        max: 10,
      },
    });

    cy.get('[data-testid="increment-button"]').should('be.disabled');
  });

  it('disables decrement button at min value', () => {
    cy.mount(Counter, {
      props: {
        initialValue: 0,
        min: 0,
      },
    });

    cy.get('[data-testid="decrement-button"]').should('be.disabled');
  });
});
```

---

## 6. Testing Angular Components

### Angular Component Example

```typescript
// todo-list.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

@Component({
  selector: 'app-todo-list',
  template: `
    <div class="todo-list" data-testid="todo-list">
      <h2>{{ title }}</h2>
      <ul>
        <li
          *ngFor="let todo of todos"
          [class.completed]="todo.completed"
          [attr.data-testid]="'todo-item-' + todo.id"
        >
          <input
            type="checkbox"
            [checked]="todo.completed"
            (change)="toggleTodo(todo)"
            [attr.data-testid]="'todo-checkbox-' + todo.id"
          />
          <span [attr.data-testid]="'todo-text-' + todo.id">
            {{ todo.text }}
          </span>
          <button
            (click)="deleteTodo(todo)"
            [attr.data-testid]="'todo-delete-' + todo.id"
          >
            Delete
          </button>
        </li>
      </ul>
      <form (ngSubmit)="addTodo()" data-testid="add-todo-form">
        <input
          [(ngModel)]="newTodoText"
          name="newTodo"
          placeholder="Add new todo"
          data-testid="new-todo-input"
        />
        <button type="submit" data-testid="add-todo-button">Add</button>
      </form>
    </div>
  `,
})
export class TodoListComponent {
  @Input() title = 'My Todos';
  @Input() todos: Todo[] = [];
  @Output() todoAdded = new EventEmitter<string>();
  @Output() todoToggled = new EventEmitter<Todo>();
  @Output() todoDeleted = new EventEmitter<Todo>();

  newTodoText = '';

  addTodo() {
    if (this.newTodoText.trim()) {
      this.todoAdded.emit(this.newTodoText.trim());
      this.newTodoText = '';
    }
  }

  toggleTodo(todo: Todo) {
    this.todoToggled.emit(todo);
  }

  deleteTodo(todo: Todo) {
    this.todoDeleted.emit(todo);
  }
}
```

### Angular Component Test

```typescript
// todo-list.component.cy.ts
import { TodoListComponent, Todo } from './todo-list.component';
import { FormsModule } from '@angular/forms';

describe('TodoListComponent', () => {
  const sampleTodos: Todo[] = [
    { id: 1, text: 'Learn Cypress', completed: false },
    { id: 2, text: 'Write tests', completed: true },
    { id: 3, text: 'Ship code', completed: false },
  ];

  it('renders with default title', () => {
    cy.mount(TodoListComponent, {
      imports: [FormsModule],
    });

    cy.get('h2').should('have.text', 'My Todos');
  });

  it('renders with custom title and todos', () => {
    cy.mount(TodoListComponent, {
      imports: [FormsModule],
      componentProperties: {
        title: 'Project Tasks',
        todos: sampleTodos,
      },
    });

    cy.get('h2').should('have.text', 'Project Tasks');
    cy.get('[data-testid^="todo-item-"]').should('have.length', 3);
  });

  it('displays completed todos with correct styling', () => {
    cy.mount(TodoListComponent, {
      imports: [FormsModule],
      componentProperties: {
        todos: sampleTodos,
      },
    });

    // Completed todo should have 'completed' class
    cy.get('[data-testid="todo-item-2"]').should('have.class', 'completed');
    cy.get('[data-testid="todo-checkbox-2"]').should('be.checked');

    // Incomplete todos should not have 'completed' class
    cy.get('[data-testid="todo-item-1"]')
      .should('not.have.class', 'completed');
  });

  it('emits todoToggled when checkbox is clicked', () => {
    const onToggleSpy = cy.spy().as('onToggle');

    cy.mount(TodoListComponent, {
      imports: [FormsModule],
      componentProperties: {
        todos: sampleTodos,
        todoToggled: {
          emit: onToggleSpy,
        } as any,
      },
    });

    cy.get('[data-testid="todo-checkbox-1"]').click();
    cy.get('@onToggle').should('have.been.calledWith', sampleTodos[0]);
  });

  it('emits todoDeleted when delete button is clicked', () => {
    const onDeleteSpy = cy.spy().as('onDelete');

    cy.mount(TodoListComponent, {
      imports: [FormsModule],
      componentProperties: {
        todos: sampleTodos,
        todoDeleted: {
          emit: onDeleteSpy,
        } as any,
      },
    });

    cy.get('[data-testid="todo-delete-1"]').click();
    cy.get('@onDelete').should('have.been.calledWith', sampleTodos[0]);
  });

  it('emits todoAdded when form is submitted', () => {
    const onAddSpy = cy.spy().as('onAdd');

    cy.mount(TodoListComponent, {
      imports: [FormsModule],
      componentProperties: {
        todos: [],
        todoAdded: {
          emit: onAddSpy,
        } as any,
      },
    });

    cy.get('[data-testid="new-todo-input"]').type('New task');
    cy.get('[data-testid="add-todo-button"]').click();

    cy.get('@onAdd').should('have.been.calledWith', 'New task');
    cy.get('[data-testid="new-todo-input"]').should('have.value', '');
  });

  it('does not emit todoAdded for empty input', () => {
    const onAddSpy = cy.spy().as('onAdd');

    cy.mount(TodoListComponent, {
      imports: [FormsModule],
      componentProperties: {
        todos: [],
        todoAdded: {
          emit: onAddSpy,
        } as any,
      },
    });

    cy.get('[data-testid="add-todo-button"]').click();
    cy.get('@onAdd').should('not.have.been.called');
  });
});
```

---

## 7. Working with Props and Events

### Testing Props

```typescript
// Alert.cy.tsx
import Alert from './Alert';

describe('Alert Component Props', () => {
  it('renders different variants', () => {
    // Test each variant
    const variants = ['success', 'warning', 'error', 'info'] as const;

    variants.forEach((variant) => {
      cy.mount(<Alert variant={variant} message="Test message" />);
      cy.get('.alert').should('have.class', `alert-${variant}`);
    });
  });

  it('renders with optional icon', () => {
    // Without icon
    cy.mount(<Alert message="No icon" showIcon={false} />);
    cy.get('[data-testid="alert-icon"]').should('not.exist');

    // With icon
    cy.mount(<Alert message="With icon" showIcon={true} />);
    cy.get('[data-testid="alert-icon"]').should('be.visible');
  });

  it('renders dismissible alert', () => {
    const onDismiss = cy.stub().as('onDismiss');

    cy.mount(
      <Alert
        message="Dismissible alert"
        dismissible={true}
        onDismiss={onDismiss}
      />
    );

    cy.get('[data-testid="dismiss-button"]').should('be.visible');
    cy.get('[data-testid="dismiss-button"]').click();
    cy.get('@onDismiss').should('have.been.calledOnce');
  });
});
```

### Testing Events and Callbacks

```typescript
// SearchInput.cy.tsx
import SearchInput from './SearchInput';

describe('SearchInput Events', () => {
  it('calls onSearch when form is submitted', () => {
    const onSearch = cy.stub().as('onSearch');

    cy.mount(<SearchInput onSearch={onSearch} />);

    cy.get('[data-testid="search-input"]').type('cypress testing');
    cy.get('[data-testid="search-form"]').submit();

    cy.get('@onSearch').should('have.been.calledWith', 'cypress testing');
  });

  it('calls onChange on every keystroke', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<SearchInput onChange={onChange} />);

    cy.get('[data-testid="search-input"]').type('abc');

    // Verify onChange was called for each character
    cy.get('@onChange').should('have.callCount', 3);
  });

  it('debounces search with debounceMs prop', () => {
    const onSearch = cy.stub().as('onSearch');

    cy.mount(
      <SearchInput
        onSearch={onSearch}
        debounceMs={300}
        searchOnType={true}
      />
    );

    // Type quickly
    cy.get('[data-testid="search-input"]').type('test');

    // Should not have called immediately
    cy.get('@onSearch').should('not.have.been.called');

    // Wait for debounce
    cy.wait(350);
    cy.get('@onSearch').should('have.been.calledOnce');
    cy.get('@onSearch').should('have.been.calledWith', 'test');
  });
});
```

---

## 8. Stubbing Dependencies

### Stubbing HTTP Requests

```typescript
// UserList.cy.tsx
import UserList from './UserList';

describe('UserList with API Stubbing', () => {
  it('displays users from API', () => {
    // Stub the API response
    cy.intercept('GET', '/api/users', {
      statusCode: 200,
      body: [
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
      ],
    }).as('getUsers');

    cy.mount(<UserList />);

    // Wait for API call
    cy.wait('@getUsers');

    // Verify users are displayed
    cy.get('[data-testid="user-item"]').should('have.length', 2);
    cy.get('[data-testid="user-item"]').first().should('contain', 'Alice');
  });

  it('displays error message on API failure', () => {
    // Stub API to return error
    cy.intercept('GET', '/api/users', {
      statusCode: 500,
      body: { error: 'Internal Server Error' },
    }).as('getUsers');

    cy.mount(<UserList />);

    cy.wait('@getUsers');

    cy.get('[data-testid="error-message"]')
      .should('be.visible')
      .and('contain', 'Failed to load users');
  });

  it('displays loading state while fetching', () => {
    // Delay the response to test loading state
    cy.intercept('GET', '/api/users', {
      statusCode: 200,
      body: [],
      delay: 1000,
    }).as('getUsers');

    cy.mount(<UserList />);

    // Verify loading state
    cy.get('[data-testid="loading-spinner"]').should('be.visible');

    // Wait for response
    cy.wait('@getUsers');

    // Loading should be hidden
    cy.get('[data-testid="loading-spinner"]').should('not.exist');
  });
});
```

### Stubbing Module Dependencies

```typescript
// analytics.ts (module to stub)
export const trackEvent = (event: string, data: object) => {
  // Send to analytics service
};

// ProductCard.cy.tsx
import ProductCard from './ProductCard';
import * as analytics from './analytics';

describe('ProductCard with Stubbed Analytics', () => {
  beforeEach(() => {
    // Stub the analytics module
    cy.stub(analytics, 'trackEvent').as('trackEvent');
  });

  it('tracks add to cart event', () => {
    const product = {
      id: 'prod-123',
      name: 'Widget',
      price: 29.99,
    };

    cy.mount(<ProductCard product={product} />);

    cy.get('[data-testid="add-to-cart"]').click();

    cy.get('@trackEvent').should('have.been.calledWith', 'add_to_cart', {
      productId: 'prod-123',
      productName: 'Widget',
      price: 29.99,
    });
  });
});
```

### Stubbing Timers

```typescript
// Notification.cy.tsx
import Notification from './Notification';

describe('Notification with Timer Stubbing', () => {
  beforeEach(() => {
    // Use fake timers
    cy.clock();
  });

  it('auto-dismisses after timeout', () => {
    const onDismiss = cy.stub().as('onDismiss');

    cy.mount(
      <Notification
        message="Auto dismiss"
        autoDismiss={true}
        dismissAfter={5000}
        onDismiss={onDismiss}
      />
    );

    // Notification should be visible
    cy.get('[data-testid="notification"]').should('be.visible');

    // Advance time by 5 seconds
    cy.tick(5000);

    // Verify onDismiss was called
    cy.get('@onDismiss').should('have.been.calledOnce');
  });
});
```

---

## 9. Visual Testing

### Snapshot Testing with Percy

```typescript
// Button.cy.tsx
import Button from './Button';

describe('Button Visual Tests', () => {
  it('renders all button variants', () => {
    cy.mount(
      <div style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
    );

    // Take Percy snapshot
    cy.percySnapshot('Button Variants');
  });

  it('renders button states', () => {
    cy.mount(
      <div style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
        <Button>Default</Button>
        <Button disabled>Disabled</Button>
        <Button loading>Loading</Button>
      </div>
    );

    cy.percySnapshot('Button States');
  });

  it('renders button sizes', () => {
    cy.mount(
      <div style={{ display: 'flex', gap: '1rem', padding: '1rem', alignItems: 'center' }}>
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </div>
    );

    cy.percySnapshot('Button Sizes');
  });
});
```

### Visual Regression with cypress-image-snapshot

```typescript
// Card.cy.tsx
import Card from './Card';
import { addMatchImageSnapshotCommand } from 'cypress-image-snapshot/command';

// Add to cypress/support/component.ts
addMatchImageSnapshotCommand();

describe('Card Visual Regression', () => {
  it('matches snapshot for default card', () => {
    cy.mount(
      <Card
        title="Test Card"
        description="This is a test card"
        image="/placeholder.jpg"
      />
    );

    cy.get('[data-testid="card"]').matchImageSnapshot('default-card');
  });

  it('matches snapshot for hover state', () => {
    cy.mount(
      <Card
        title="Hover Card"
        description="Hover over me"
        hoverable
      />
    );

    cy.get('[data-testid="card"]').trigger('mouseover');
    cy.get('[data-testid="card"]').matchImageSnapshot('card-hover-state');
  });
});
```

### Testing Responsive Layouts

```typescript
// ResponsiveGrid.cy.tsx
import ResponsiveGrid from './ResponsiveGrid';

describe('ResponsiveGrid Visual Tests', () => {
  const viewports = [
    { width: 375, height: 667, name: 'mobile' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1280, height: 720, name: 'desktop' },
  ];

  viewports.forEach(({ width, height, name }) => {
    it(`renders correctly on ${name}`, () => {
      cy.viewport(width, height);

      cy.mount(
        <ResponsiveGrid>
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
          <div>Item 4</div>
        </ResponsiveGrid>
      );

      // Verify layout changes
      if (name === 'mobile') {
        cy.get('.grid').should('have.css', 'grid-template-columns', '1fr');
      } else if (name === 'tablet') {
        cy.get('.grid').should('have.css', 'grid-template-columns')
          .and('match', /repeat\(2/);
      } else {
        cy.get('.grid').should('have.css', 'grid-template-columns')
          .and('match', /repeat\(4/);
      }

      cy.percySnapshot(`ResponsiveGrid - ${name}`);
    });
  });
});
```

---

## 10. Best Practices Summary

### Test Organization

```typescript
// Organize tests by behavior, not implementation
describe('LoginForm', () => {
  describe('validation', () => {
    it('shows error for invalid email');
    it('shows error for short password');
    it('disables submit until form is valid');
  });

  describe('submission', () => {
    it('submits valid credentials');
    it('shows error on failed login');
    it('redirects on successful login');
  });

  describe('accessibility', () => {
    it('has proper ARIA labels');
    it('supports keyboard navigation');
  });
});
```

### Use Data-TestId Attributes

```typescript
// Prefer data-testid over CSS classes or element types
// Good
cy.get('[data-testid="submit-button"]').click();

// Avoid - fragile selectors
cy.get('.btn-primary').click();
cy.get('button').first().click();
```

### Keep Tests Independent

```typescript
// Each test should set up its own state
describe('ShoppingCart', () => {
  // Reset state before each test
  beforeEach(() => {
    cy.intercept('GET', '/api/cart', { items: [] });
  });

  it('adds item to empty cart', () => {
    // Test starts with known state
  });

  it('removes item from cart', () => {
    // Set up specific state for this test
    cy.intercept('GET', '/api/cart', {
      items: [{ id: 1, name: 'Test Item' }],
    });
  });
});
```

### Test User Behavior, Not Implementation

```typescript
// Good - tests user behavior
it('allows user to complete checkout', () => {
  cy.mount(<Checkout />);
  cy.get('[data-testid="shipping-form"]').within(() => {
    cy.get('input[name="address"]').type('123 Main St');
    cy.get('input[name="city"]').type('New York');
  });
  cy.get('[data-testid="continue-button"]').click();
  cy.get('[data-testid="payment-form"]').should('be.visible');
});

// Avoid - tests implementation details
it('sets shippingAddress state correctly', () => {
  // Testing internal state is fragile
});
```

### Use Aliases for Readability

```typescript
it('filters products by category', () => {
  cy.intercept('GET', '/api/products*').as('getProducts');
  cy.mount(<ProductList />);

  cy.wait('@getProducts');

  cy.get('[data-testid="category-filter"]').as('categoryFilter');
  cy.get('[data-testid="product-grid"]').as('productGrid');

  cy.get('@categoryFilter').select('Electronics');
  cy.wait('@getProducts');
  cy.get('@productGrid').find('[data-testid="product-card"]')
    .should('have.length.greaterThan', 0);
});
```

### Quick Reference

| Do | Avoid |
|-----|-------|
| Use data-testid selectors | Rely on CSS classes |
| Test user interactions | Test internal state |
| Stub external dependencies | Make real API calls |
| Keep tests independent | Share state between tests |
| Use meaningful assertions | Assert on implementation details |
| Test error states | Only test happy paths |
| Run tests in CI | Only run locally |

---

## Conclusion

Cypress component testing provides a powerful way to test your UI components in isolation while maintaining the benefits of real browser rendering. By following the patterns in this guide, you can build a robust component test suite that catches bugs early, documents component behavior, and gives you confidence when refactoring.

Key takeaways:
- Use `cy.mount()` to render components in isolation
- Leverage Cypress commands for interactions and assertions
- Stub external dependencies with `cy.intercept()` and `cy.stub()`
- Test props, events, and user interactions
- Add visual testing for UI regression prevention

Start small with a few critical components and expand your test coverage over time. The investment in component testing pays dividends in code quality and developer confidence.

---

*Need to monitor your application after testing? [OneUptime](https://oneuptime.com) provides comprehensive observability with uptime monitoring, incident management, and status pages to ensure your tested components perform reliably in production.*
