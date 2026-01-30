# How to Build Command Line Tools with Bubbletea in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, CLI, Bubbletea, TUI

Description: Learn how to build interactive terminal user interfaces in Go using the Bubbletea framework with the Elm architecture.

---

Building interactive command-line tools has never been easier thanks to Bubbletea, a powerful Go framework based on the Elm architecture. This guide walks you through creating polished terminal user interfaces (TUIs) that feel responsive and intuitive.

## Understanding the Elm Architecture

Bubbletea follows the Elm architecture pattern, which consists of three core components:

1. **Model**: Holds your application state
2. **Update**: Handles messages and updates the model
3. **View**: Renders the UI based on the current model

This separation of concerns makes your code predictable and easy to test.

## Setting Up Your Project

First, install Bubbletea and its companion libraries:

```bash
go mod init mytui
go get github.com/charmbracelet/bubbletea
go get github.com/charmbracelet/bubbles
go get github.com/charmbracelet/lipgloss
```

## Building a Simple Counter App

Let's start with a basic counter application that demonstrates the core concepts:

```go
package main

import (
    "fmt"
    "os"

    tea "github.com/charmbracelet/bubbletea"
)

// Model holds the application state
type model struct {
    count int
}

// Init returns an initial command for the application
func (m model) Init() tea.Cmd {
    // No initial command needed
    return nil
}

// Update handles incoming messages and updates the model
func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case tea.KeyMsg:
        switch msg.String() {
        case "q", "ctrl+c":
            // Exit the application
            return m, tea.Quit
        case "up", "k":
            // Increment the counter
            m.count++
        case "down", "j":
            // Decrement the counter
            m.count--
        }
    }
    return m, nil
}

// View renders the current state as a string
func (m model) View() string {
    return fmt.Sprintf(
        "\n  Counter: %d\n\n  Press up/down or j/k to change\n  Press q to quit\n",
        m.count,
    )
}

func main() {
    // Create and run the program
    p := tea.NewProgram(model{count: 0})
    if _, err := p.Run(); err != nil {
        fmt.Printf("Error running program: %v", err)
        os.Exit(1)
    }
}
```

## Handling Keyboard Input

Bubbletea provides rich keyboard handling through `tea.KeyMsg`. You can match specific keys, key combinations, and special keys:

```go
func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case tea.KeyMsg:
        switch msg.Type {
        case tea.KeyEnter:
            // Handle Enter key
            return m, m.submit()
        case tea.KeyEsc:
            // Handle Escape key
            return m, tea.Quit
        }

        // Match by string representation
        switch msg.String() {
        case "ctrl+s":
            // Handle Ctrl+S
            return m, m.save()
        case "tab":
            // Handle Tab key
            m.focusNext()
        }
    }
    return m, nil
}
```

## Using Bubbles Components

Bubbles is a collection of pre-built components that work with Bubbletea. Here's an example using the text input component:

```go
package main

import (
    "fmt"
    "os"

    "github.com/charmbracelet/bubbles/textinput"
    tea "github.com/charmbracelet/bubbletea"
)

type model struct {
    textInput textinput.Model
    submitted bool
    value     string
}

func initialModel() model {
    // Create a new text input component
    ti := textinput.New()
    ti.Placeholder = "Enter your name"
    ti.Focus()
    ti.CharLimit = 50
    ti.Width = 30

    return model{
        textInput: ti,
    }
}

func (m model) Init() tea.Cmd {
    // Start the cursor blinking
    return textinput.Blink
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    var cmd tea.Cmd

    switch msg := msg.(type) {
    case tea.KeyMsg:
        switch msg.Type {
        case tea.KeyEnter:
            // Capture the input value on submit
            m.value = m.textInput.Value()
            m.submitted = true
            return m, tea.Quit
        case tea.KeyCtrlC, tea.KeyEsc:
            return m, tea.Quit
        }
    }

    // Pass messages to the text input component
    m.textInput, cmd = m.textInput.Update(msg)
    return m, cmd
}

func (m model) View() string {
    if m.submitted {
        return fmt.Sprintf("\n  Hello, %s!\n\n", m.value)
    }
    return fmt.Sprintf(
        "\n  What's your name?\n\n  %s\n\n  (press Enter to submit)\n",
        m.textInput.View(),
    )
}

func main() {
    p := tea.NewProgram(initialModel())
    if _, err := p.Run(); err != nil {
        fmt.Printf("Error: %v", err)
        os.Exit(1)
    }
}
```

## Styling with Lipgloss

Lipgloss provides declarative styling for terminal output. Use it to add colors, borders, and layouts:

```go
package main

import (
    "github.com/charmbracelet/lipgloss"
)

// Define reusable styles
var (
    titleStyle = lipgloss.NewStyle().
        Bold(true).
        Foreground(lipgloss.Color("#FAFAFA")).
        Background(lipgloss.Color("#7D56F4")).
        Padding(0, 1)

    itemStyle = lipgloss.NewStyle().
        PaddingLeft(2)

    selectedStyle = lipgloss.NewStyle().
        PaddingLeft(2).
        Foreground(lipgloss.Color("#7D56F4")).
        Bold(true)

    boxStyle = lipgloss.NewStyle().
        Border(lipgloss.RoundedBorder()).
        BorderForeground(lipgloss.Color("#874BFD")).
        Padding(1, 2)
)

func (m model) View() string {
    // Apply styles in the View function
    title := titleStyle.Render("My TUI App")

    var items string
    for i, item := range m.items {
        if i == m.cursor {
            items += selectedStyle.Render("> " + item) + "\n"
        } else {
            items += itemStyle.Render("  " + item) + "\n"
        }
    }

    // Wrap everything in a box
    content := title + "\n\n" + items
    return boxStyle.Render(content)
}
```

## Putting It All Together

When building complex TUIs, combine these concepts to create modular, maintainable applications:

1. Define your model with all necessary state
2. Initialize components in your constructor function
3. Route messages to the appropriate handlers in Update
4. Compose styled views using Lipgloss

Bubbletea's architecture encourages small, focused functions that are easy to test and reason about. Start simple and gradually add complexity as your application grows.

## Conclusion

Bubbletea makes building terminal applications in Go approachable and enjoyable. The Elm architecture provides a solid foundation for managing state and handling user input. Combined with Bubbles for pre-built components and Lipgloss for styling, you have everything needed to create professional command-line tools that users will love.

For more examples and documentation, visit the [Charm](https://charm.sh) website and explore the official repositories on GitHub.
