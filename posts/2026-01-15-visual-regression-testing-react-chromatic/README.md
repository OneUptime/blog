# How to Implement Visual Regression Testing for React with Chromatic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Visual Regression, Chromatic, Storybook, Testing, UI Testing

Description: Learn to implement visual regression testing for React applications using Chromatic and Storybook to catch unintended UI changes before they reach production.

---

Visual changes in your UI can slip through code reviews unnoticed. A CSS change that looks fine in one component might break the layout in another. Traditional unit tests check logic, but they cannot verify that your buttons, forms, and layouts actually look correct. Visual regression testing captures screenshots of your components and compares them against baselines, alerting you to any pixel-level changes.

## The Problem Visual Regression Testing Solves

| Issue | Impact |
|-------|--------|
| **CSS side effects** | Changes cascade unexpectedly |
| **Font rendering** | Different browsers render differently |
| **Layout shifts** | Spacing issues missed in review |
| **Responsive breakage** | Mobile views break silently |
| **Theme inconsistencies** | Dark mode or brand colors drift |
| **Component library updates** | Third-party changes break UI |

Manual visual QA is time-consuming and error-prone. Engineers cannot reliably spot subtle differences across hundreds of component states. Visual regression testing automates this process.

## How Visual Regression Testing Works

Visual regression testing follows a straightforward workflow:

1. **Capture baselines** - Take screenshots of components in their known-good state
2. **Run tests** - After code changes, capture new screenshots
3. **Compare** - Pixel-by-pixel comparison against baselines
4. **Review** - Human approval for intentional changes
5. **Update baselines** - Accept new screenshots as the new standard

Chromatic integrates this workflow into your CI/CD pipeline, making it seamless for teams.

## Why Chromatic for Visual Testing

Chromatic is built by the team behind Storybook. This tight integration provides several advantages:

| Feature | Benefit |
|---------|---------|
| **Storybook-native** | Uses your existing stories as test cases |
| **Cloud infrastructure** | Parallel screenshot capture across browsers |
| **Smart baselines** | Per-branch baselines prevent false positives |
| **Pull request integration** | Blocks merges until visual changes approved |
| **Component-level tracking** | See exactly which components changed |
| **Interaction testing** | Capture states after user interactions |

## Setting Up Storybook

Storybook is the foundation for Chromatic. If you do not already have Storybook installed, set it up first.

### Installing Storybook

```bash
npx storybook@latest init
```

This command detects your framework and installs the appropriate dependencies. It creates a `.storybook` directory with configuration files.

### Storybook Configuration

```javascript
// .storybook/main.js
module.exports = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
};
```

### Preview Configuration

```javascript
// .storybook/preview.js
import '../src/styles/globals.css';

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
  backgrounds: {
    default: 'light',
    values: [
      { name: 'light', value: '#ffffff' },
      { name: 'dark', value: '#1a1a2e' },
    ],
  },
};

export const decorators = [
  (Story) => (
    <div style={{ padding: '1rem' }}>
      <Story />
    </div>
  ),
];
```

## Writing Stories for Visual Testing

Stories define the states of your components that Chromatic will capture.

### Basic Component Story

```javascript
// src/components/Button/Button.stories.jsx
import { Button } from './Button';

export default {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'ghost'],
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
  },
};

export const Primary = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

export const Secondary = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

export const Danger = {
  args: {
    variant: 'danger',
    children: 'Delete',
  },
};

export const Disabled = {
  args: {
    variant: 'primary',
    children: 'Disabled Button',
    disabled: true,
  },
};

export const Sizes = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <Button size="small">Small</Button>
      <Button size="medium">Medium</Button>
      <Button size="large">Large</Button>
    </div>
  ),
};
```

### Input Component with States

```javascript
// src/components/Input/Input.stories.jsx
import { Input } from './Input';

export default {
  title: 'Components/Input',
  component: Input,
  tags: ['autodocs'],
};

export const Default = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const WithLabel = {
  args: {
    label: 'Email Address',
    placeholder: 'you@example.com',
  },
};

export const WithError = {
  args: {
    label: 'Email Address',
    value: 'invalid-email',
    error: 'Please enter a valid email address',
  },
};

export const AllStates = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '400px' }}>
      <Input label="Default" placeholder="Enter text..." />
      <Input label="With Value" value="Hello World" />
      <Input label="With Error" value="bad" error="Invalid input" />
      <Input label="Disabled" value="Cannot edit" disabled />
    </div>
  ),
};
```

## Installing Chromatic

With Storybook set up, install Chromatic:

```bash
npm install --save-dev chromatic
```

### Creating a Chromatic Project

1. Sign up at [chromatic.com](https://www.chromatic.com/) using your GitHub, GitLab, or Bitbucket account
2. Create a new project and link it to your repository
3. Copy the project token provided by Chromatic

### First Chromatic Build

```bash
npx chromatic --project-token=chpt_xxxxxxxxxxxxxxx
```

This command builds your Storybook, uploads it to Chromatic's cloud, captures screenshots of every story, and establishes baselines.

### Package.json Scripts

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "chromatic": "chromatic --exit-zero-on-changes",
    "chromatic:ci": "chromatic"
  }
}
```

## Configuring Chromatic

### Chromatic Configuration File

```json
// chromatic.config.json
{
  "projectToken": "chpt_xxxxxxxxxxxxxxx",
  "buildScriptName": "build-storybook",
  "onlyChanged": true,
  "externals": ["public/**"],
  "skip": "dependabot/**"
}
```

| Option | Description |
|--------|-------------|
| `projectToken` | Your Chromatic project identifier |
| `buildScriptName` | npm script to build Storybook |
| `onlyChanged` | Only test stories affected by code changes |
| `externals` | Files outside src that affect visual output |
| `skip` | Branch patterns to skip |

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/chromatic.yml
name: Chromatic

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          exitZeroOnChanges: false
          exitOnceUploaded: true
          onlyChanged: true
```

### GitLab CI

```yaml
# .gitlab-ci.yml
chromatic:
  stage: visual
  image: node:20
  before_script:
    - npm ci
  script:
    - npx chromatic --project-token=$CHROMATIC_PROJECT_TOKEN
  only:
    - merge_requests
    - main
```

### CircleCI

```yaml
# .circleci/config.yml
version: 2.1

orbs:
  node: circleci/node@5

jobs:
  chromatic:
    executor:
      name: node/default
      tag: '20.11'
    steps:
      - checkout
      - node/install-packages
      - run:
          name: Run Chromatic
          command: npx chromatic --project-token=$CHROMATIC_PROJECT_TOKEN

workflows:
  build-and-test:
    jobs:
      - chromatic
```

## Handling Visual Changes

When Chromatic detects visual differences, it creates a changeset for review.

### Accepting Changes

1. Open the Chromatic build in the web UI
2. Review each changed story
3. Click "Accept" for intentional changes
4. Click "Deny" for unintentional regressions

Accepted changes become the new baseline for future comparisons.

## Advanced Configuration

### Viewport Testing

```javascript
// .storybook/preview.js
export const parameters = {
  chromatic: {
    viewports: [320, 768, 1024, 1440],
  },
};
```

### Delay for Animations

```javascript
export const WithAnimation = {
  parameters: {
    chromatic: {
      delay: 500,
    },
  },
};
```

### Disabling Snapshots

```javascript
export const RandomContent = {
  parameters: {
    chromatic: {
      disableSnapshot: true,
    },
  },
};
```

### Testing Dark Mode

```javascript
// .storybook/preview.js
import { ThemeProvider } from '../src/theme';

export const decorators = [
  (Story, context) => {
    const theme = context.globals.theme || 'light';
    return (
      <ThemeProvider theme={theme}>
        <Story />
      </ThemeProvider>
    );
  },
];

export const globalTypes = {
  theme: {
    name: 'Theme',
    defaultValue: 'light',
    toolbar: {
      icon: 'circlehollow',
      items: ['light', 'dark'],
    },
  },
};
```

Capture both themes in Chromatic:

```javascript
export const AllThemes = {
  parameters: {
    chromatic: {
      modes: {
        light: { theme: 'light' },
        dark: { theme: 'dark' },
      },
    },
  },
};
```

## Interaction Testing

Capture visual states after user interactions:

```javascript
// src/components/Dropdown/Dropdown.stories.jsx
import { within, userEvent } from '@storybook/testing-library';

export default {
  title: 'Components/Dropdown',
  component: Dropdown,
};

export const Closed = {
  args: {
    options: ['Option 1', 'Option 2', 'Option 3'],
    placeholder: 'Select an option',
  },
};

export const Open = {
  args: {
    options: ['Option 1', 'Option 2', 'Option 3'],
    placeholder: 'Select an option',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button'));
  },
};

export const WithSelection = {
  args: {
    options: ['Option 1', 'Option 2', 'Option 3'],
    placeholder: 'Select an option',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button'));
    await userEvent.click(canvas.getByText('Option 2'));
  },
};
```

### Form Interactions

```javascript
import { within, userEvent } from '@storybook/testing-library';
import { expect } from '@storybook/jest';

export default {
  title: 'Components/Form',
  component: LoginForm,
};

export const Empty = {};

export const Filled = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Email'), 'user@example.com');
    await userEvent.type(canvas.getByLabelText('Password'), 'password123');
  },
};

export const WithValidationErrors = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Email'), 'invalid');
    await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
  },
};
```

## Troubleshooting

### Flaky Tests

```javascript
export const AsyncContent = {
  parameters: {
    chromatic: {
      delay: 1000,
    },
  },
};
```

### Dynamic Content

```jsx
<div data-chromatic="ignore">
  Last updated: {new Date().toLocaleString()}
</div>
```

### Browser-Specific Rendering

```json
// chromatic.config.json
{
  "browsers": ["chrome", "firefox", "safari"]
}
```

## Best Practices

| Practice | Recommendation |
|----------|----------------|
| **Story organization** | Keep stories next to components |
| **Naming** | Use Default, Primary, Secondary, Disabled, Error |
| **Coverage** | Test all variants, sizes, and states |
| **Baselines** | Review changes thoughtfully before accepting |
| **Performance** | Use turboSnap, skip heavy stories |

## Testing Strategy Integration

| Test Type | What It Catches |
|-----------|-----------------|
| **Unit tests** | Logic errors |
| **Integration tests** | Component interaction bugs |
| **E2E tests** | User journey failures |
| **Visual tests** | UI regressions |

Visual tests should not replace other tests but add a visual safety net.

## Summary Table

| Topic | Key Points |
|-------|------------|
| **Setup** | Install Storybook, then Chromatic. Write stories for all component states. |
| **CI Integration** | Use GitHub Actions, GitLab CI, or CircleCI. Require approval before merge. |
| **Story Writing** | Cover default, variants, states, and edge cases. Use composition stories. |
| **Interaction Testing** | Use play functions to capture hover, focus, and form states. |
| **Viewports** | Test at 320px, 768px, 1024px, 1440px minimum. |
| **Dark Mode** | Use modes parameter to capture both themes. |
| **Performance** | Enable turboSnap, skip heavy stories, use delays wisely. |
| **Troubleshooting** | Mock dates, preload fonts, ignore dynamic regions. |

## Conclusion

Visual regression testing with Chromatic provides a safety net for UI changes that traditional tests cannot catch. By integrating with Storybook, you get visual coverage for every component state automatically. The workflow of capturing baselines, detecting changes, and requiring human approval ensures that no unintended visual changes reach production.

Start with a few critical components and gradually expand coverage. The investment pays off quickly when you catch that one CSS change that would have broken the checkout button on mobile.
