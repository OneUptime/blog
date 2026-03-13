# How to Use Feature Flags in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Feature Flags, A/B Testing, DevOps, Releases

Description: Implement feature flags in Go for gradual rollouts, A/B testing, and safe deployments with both custom and third-party solutions.

---

Feature flags (also known as feature toggles) are a powerful technique that allows you to modify system behavior without deploying new code. They enable teams to separate code deployment from feature release, perform gradual rollouts, conduct A/B testing, and quickly disable problematic features in production.

In this comprehensive guide, we will explore how to implement feature flags in Go, from simple in-memory solutions to integration with enterprise-grade feature flag services.

## Why Use Feature Flags?

Before diving into implementation, let us understand the key benefits of feature flags:

1. **Safe Deployments**: Deploy code to production without immediately exposing new features to users
2. **Gradual Rollouts**: Release features to a percentage of users and gradually increase exposure
3. **A/B Testing**: Compare different implementations to determine which performs better
4. **Kill Switches**: Instantly disable features that cause issues without redeployment
5. **User Targeting**: Enable features for specific user segments (beta testers, premium users, etc.)
6. **Trunk-Based Development**: Merge incomplete features to main branch safely behind flags

## Simple In-Memory Feature Flag Implementation

Let us start with a basic feature flag implementation that stores flags in memory. This approach is suitable for small applications or development environments.

### Basic Flag Structure

The following code defines a simple feature flag structure with thread-safe operations using sync.RWMutex for concurrent access.

```go
package featureflags

import (
    "sync"
    "time"
)

// Flag represents a feature flag with metadata
type Flag struct {
    Name        string    `json:"name"`
    Enabled     bool      `json:"enabled"`
    Description string    `json:"description"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}

// FlagManager manages feature flags in memory
type FlagManager struct {
    mu    sync.RWMutex
    flags map[string]*Flag
}

// NewFlagManager creates a new FlagManager instance
func NewFlagManager() *FlagManager {
    return &FlagManager{
        flags: make(map[string]*Flag),
    }
}

// Register adds a new feature flag with default state
func (fm *FlagManager) Register(name, description string, enabled bool) {
    fm.mu.Lock()
    defer fm.mu.Unlock()

    now := time.Now()
    fm.flags[name] = &Flag{
        Name:        name,
        Enabled:     enabled,
        Description: description,
        CreatedAt:   now,
        UpdatedAt:   now,
    }
}

// IsEnabled checks if a feature flag is enabled
func (fm *FlagManager) IsEnabled(name string) bool {
    fm.mu.RLock()
    defer fm.mu.RUnlock()

    if flag, exists := fm.flags[name]; exists {
        return flag.Enabled
    }
    // Return false for unknown flags (fail-safe)
    return false
}

// Enable turns on a feature flag
func (fm *FlagManager) Enable(name string) bool {
    fm.mu.Lock()
    defer fm.mu.Unlock()

    if flag, exists := fm.flags[name]; exists {
        flag.Enabled = true
        flag.UpdatedAt = time.Now()
        return true
    }
    return false
}

// Disable turns off a feature flag
func (fm *FlagManager) Disable(name string) bool {
    fm.mu.Lock()
    defer fm.mu.Unlock()

    if flag, exists := fm.flags[name]; exists {
        flag.Enabled = false
        flag.UpdatedAt = time.Now()
        return true
    }
    return false
}

// GetAll returns all registered flags
func (fm *FlagManager) GetAll() []*Flag {
    fm.mu.RLock()
    defer fm.mu.RUnlock()

    flags := make([]*Flag, 0, len(fm.flags))
    for _, flag := range fm.flags {
        flags = append(flags, flag)
    }
    return flags
}
```

### Using the Basic Flag Manager

Here is how you would use the basic flag manager in your application to conditionally enable features.

```go
package main

import (
    "fmt"
    "your-project/featureflags"
)

func main() {
    // Initialize the flag manager
    fm := featureflags.NewFlagManager()

    // Register feature flags
    fm.Register("new_checkout_flow", "New streamlined checkout experience", false)
    fm.Register("dark_mode", "Enable dark mode UI", true)
    fm.Register("experimental_search", "AI-powered search results", false)

    // Check flags before executing features
    if fm.IsEnabled("new_checkout_flow") {
        handleNewCheckout()
    } else {
        handleLegacyCheckout()
    }

    // Toggle flags dynamically
    fm.Enable("new_checkout_flow")
    fmt.Println("New checkout enabled:", fm.IsEnabled("new_checkout_flow"))
}

func handleNewCheckout() {
    fmt.Println("Processing with new checkout flow...")
}

func handleLegacyCheckout() {
    fmt.Println("Processing with legacy checkout flow...")
}
```

## Percentage-Based Rollouts

Gradual rollouts allow you to release features to a percentage of users, reducing risk by limiting initial exposure. The following implementation uses consistent hashing to ensure users get the same experience across requests.

### Percentage Rollout Implementation

This implementation uses a hash of the user identifier to determine if a user should see the feature, ensuring consistent behavior across sessions.

```go
package featureflags

import (
    "crypto/sha256"
    "encoding/binary"
    "sync"
    "time"
)

// RolloutFlag represents a feature flag with percentage-based rollout
type RolloutFlag struct {
    Name           string    `json:"name"`
    Description    string    `json:"description"`
    Enabled        bool      `json:"enabled"`
    RolloutPercent float64   `json:"rollout_percent"` // 0.0 to 100.0
    CreatedAt      time.Time `json:"created_at"`
    UpdatedAt      time.Time `json:"updated_at"`
}

// RolloutManager manages percentage-based feature rollouts
type RolloutManager struct {
    mu    sync.RWMutex
    flags map[string]*RolloutFlag
}

// NewRolloutManager creates a new RolloutManager instance
func NewRolloutManager() *RolloutManager {
    return &RolloutManager{
        flags: make(map[string]*RolloutFlag),
    }
}

// Register adds a new rollout flag
func (rm *RolloutManager) Register(name, description string, percent float64) {
    rm.mu.Lock()
    defer rm.mu.Unlock()

    now := time.Now()
    rm.flags[name] = &RolloutFlag{
        Name:           name,
        Description:    description,
        Enabled:        percent > 0,
        RolloutPercent: percent,
        CreatedAt:      now,
        UpdatedAt:      now,
    }
}

// IsEnabledForUser checks if a feature is enabled for a specific user
// Uses consistent hashing to ensure the same user always gets the same result
func (rm *RolloutManager) IsEnabledForUser(flagName, userID string) bool {
    rm.mu.RLock()
    defer rm.mu.RUnlock()

    flag, exists := rm.flags[flagName]
    if !exists || !flag.Enabled {
        return false
    }

    // 100% rollout - everyone gets the feature
    if flag.RolloutPercent >= 100.0 {
        return true
    }

    // 0% rollout - no one gets the feature
    if flag.RolloutPercent <= 0.0 {
        return false
    }

    // Calculate a consistent hash for this user and flag combination
    bucket := calculateBucket(flagName, userID)
    return bucket < flag.RolloutPercent
}

// SetRolloutPercent updates the rollout percentage for a flag
func (rm *RolloutManager) SetRolloutPercent(name string, percent float64) bool {
    rm.mu.Lock()
    defer rm.mu.Unlock()

    if flag, exists := rm.flags[name]; exists {
        flag.RolloutPercent = percent
        flag.Enabled = percent > 0
        flag.UpdatedAt = time.Now()
        return true
    }
    return false
}

// calculateBucket returns a consistent value between 0-100 for a user/flag pair
func calculateBucket(flagName, userID string) float64 {
    // Combine flag name and user ID for unique hash
    data := flagName + ":" + userID
    hash := sha256.Sum256([]byte(data))

    // Use first 8 bytes to generate a number
    num := binary.BigEndian.Uint64(hash[:8])

    // Convert to percentage (0-100)
    return float64(num%10000) / 100.0
}
```

### Using Percentage Rollouts

This example demonstrates a gradual rollout strategy, starting at 5% and increasing to 25%.

```go
package main

import (
    "fmt"
    "your-project/featureflags"
)

func main() {
    rm := featureflags.NewRolloutManager()

    // Start with 5% rollout for new recommendation engine
    rm.Register("new_recommendations", "ML-powered recommendations", 5.0)

    // Simulate checking for different users
    users := []string{"user_001", "user_002", "user_003", "user_004", "user_005",
                      "user_006", "user_007", "user_008", "user_009", "user_010"}

    fmt.Println("5% Rollout Results:")
    for _, userID := range users {
        enabled := rm.IsEnabledForUser("new_recommendations", userID)
        fmt.Printf("  User %s: %v\n", userID, enabled)
    }

    // Increase rollout to 25%
    rm.SetRolloutPercent("new_recommendations", 25.0)

    fmt.Println("\n25% Rollout Results:")
    for _, userID := range users {
        enabled := rm.IsEnabledForUser("new_recommendations", userID)
        fmt.Printf("  User %s: %v\n", userID, enabled)
    }
}
```

## User Targeting and Segmentation

Real-world feature flags often need to target specific user segments. The following implementation supports targeting based on user attributes, groups, and allow/deny lists.

### Advanced Targeting Implementation

This implementation allows complex targeting rules including specific user IDs, groups, and attribute-based conditions.

```go
package featureflags

import (
    "sync"
    "time"
)

// UserContext represents the current user's attributes for targeting
type UserContext struct {
    UserID     string
    Email      string
    Groups     []string
    Attributes map[string]interface{}
    IPAddress  string
    Country    string
}

// TargetingRule defines conditions for enabling a flag
type TargetingRule struct {
    // Specific user IDs that should see this feature
    AllowedUserIDs []string `json:"allowed_user_ids"`

    // User IDs that should never see this feature
    DeniedUserIDs []string `json:"denied_user_ids"`

    // Groups that should see this feature
    AllowedGroups []string `json:"allowed_groups"`

    // Countries where feature is enabled
    AllowedCountries []string `json:"allowed_countries"`

    // Custom attribute conditions (key -> allowed values)
    AttributeRules map[string][]interface{} `json:"attribute_rules"`

    // Percentage rollout for users who pass other rules
    RolloutPercent float64 `json:"rollout_percent"`
}

// TargetedFlag represents a feature flag with targeting rules
type TargetedFlag struct {
    Name           string        `json:"name"`
    Description    string        `json:"description"`
    Enabled        bool          `json:"enabled"`
    DefaultValue   bool          `json:"default_value"`
    TargetingRules TargetingRule `json:"targeting_rules"`
    CreatedAt      time.Time     `json:"created_at"`
    UpdatedAt      time.Time     `json:"updated_at"`
}

// TargetedFlagManager manages flags with user targeting
type TargetedFlagManager struct {
    mu    sync.RWMutex
    flags map[string]*TargetedFlag
}

// NewTargetedFlagManager creates a new TargetedFlagManager
func NewTargetedFlagManager() *TargetedFlagManager {
    return &TargetedFlagManager{
        flags: make(map[string]*TargetedFlag),
    }
}

// Register adds a new targeted flag
func (tm *TargetedFlagManager) Register(name, description string, rules TargetingRule) {
    tm.mu.Lock()
    defer tm.mu.Unlock()

    now := time.Now()
    tm.flags[name] = &TargetedFlag{
        Name:           name,
        Description:    description,
        Enabled:        true,
        DefaultValue:   false,
        TargetingRules: rules,
        CreatedAt:      now,
        UpdatedAt:      now,
    }
}

// Evaluate checks if a flag is enabled for a given user context
func (tm *TargetedFlagManager) Evaluate(flagName string, ctx UserContext) bool {
    tm.mu.RLock()
    defer tm.mu.RUnlock()

    flag, exists := tm.flags[flagName]
    if !exists || !flag.Enabled {
        return false
    }

    rules := flag.TargetingRules

    // Check deny list first (highest priority)
    if contains(rules.DeniedUserIDs, ctx.UserID) {
        return false
    }

    // Check allow list (explicit allow)
    if contains(rules.AllowedUserIDs, ctx.UserID) {
        return true
    }

    // Check group membership
    if matchesAnyGroup(ctx.Groups, rules.AllowedGroups) {
        return true
    }

    // Check country targeting
    if len(rules.AllowedCountries) > 0 && !contains(rules.AllowedCountries, ctx.Country) {
        return false
    }

    // Check custom attribute rules
    if !matchesAttributeRules(ctx.Attributes, rules.AttributeRules) {
        return false
    }

    // Apply percentage rollout for remaining users
    if rules.RolloutPercent > 0 {
        bucket := calculateBucket(flagName, ctx.UserID)
        return bucket < rules.RolloutPercent
    }

    return flag.DefaultValue
}

// Helper functions for rule evaluation
func contains(slice []string, item string) bool {
    for _, s := range slice {
        if s == item {
            return true
        }
    }
    return false
}

func matchesAnyGroup(userGroups, allowedGroups []string) bool {
    for _, ug := range userGroups {
        for _, ag := range allowedGroups {
            if ug == ag {
                return true
            }
        }
    }
    return false
}

func matchesAttributeRules(attrs map[string]interface{}, rules map[string][]interface{}) bool {
    for key, allowedValues := range rules {
        userValue, exists := attrs[key]
        if !exists {
            return false
        }

        matched := false
        for _, allowed := range allowedValues {
            if userValue == allowed {
                matched = true
                break
            }
        }
        if !matched {
            return false
        }
    }
    return true
}
```

### Using Targeted Flags

This example shows how to create flags that target specific user segments like beta testers and premium users.

```go
package main

import (
    "fmt"
    "your-project/featureflags"
)

func main() {
    tm := featureflags.NewTargetedFlagManager()

    // Register a flag for beta testers only
    tm.Register("new_dashboard", "Redesigned dashboard UI", featureflags.TargetingRule{
        AllowedGroups:  []string{"beta_testers", "internal"},
        RolloutPercent: 0, // Only for specified groups
    })

    // Register a flag for premium users in specific countries
    tm.Register("premium_feature", "Advanced analytics", featureflags.TargetingRule{
        AllowedCountries: []string{"US", "UK", "CA"},
        AttributeRules: map[string][]interface{}{
            "subscription_tier": {"premium", "enterprise"},
        },
        RolloutPercent: 100, // All matching users
    })

    // Test with different user contexts
    betaUser := featureflags.UserContext{
        UserID: "user_123",
        Groups: []string{"beta_testers"},
    }

    regularUser := featureflags.UserContext{
        UserID: "user_456",
        Groups: []string{"standard"},
    }

    premiumUser := featureflags.UserContext{
        UserID:  "user_789",
        Country: "US",
        Attributes: map[string]interface{}{
            "subscription_tier": "premium",
        },
    }

    fmt.Println("New Dashboard Access:")
    fmt.Printf("  Beta User: %v\n", tm.Evaluate("new_dashboard", betaUser))
    fmt.Printf("  Regular User: %v\n", tm.Evaluate("new_dashboard", regularUser))

    fmt.Println("\nPremium Feature Access:")
    fmt.Printf("  Premium US User: %v\n", tm.Evaluate("premium_feature", premiumUser))
    fmt.Printf("  Regular User: %v\n", tm.Evaluate("premium_feature", regularUser))
}
```

## A/B Testing Patterns

A/B testing (also known as split testing) allows you to compare different variants of a feature to determine which performs better. The following implementation supports multiple variants with weighted distribution.

### A/B Test Implementation

This implementation supports multiple variants with configurable weights, metrics tracking, and consistent user assignment.

```go
package featureflags

import (
    "crypto/sha256"
    "encoding/binary"
    "sync"
    "time"
)

// Variant represents a test variant in an A/B test
type Variant struct {
    Name   string  `json:"name"`
    Weight float64 `json:"weight"` // Relative weight for distribution
}

// ABTest represents an A/B test configuration
type ABTest struct {
    Name        string    `json:"name"`
    Description string    `json:"description"`
    Enabled     bool      `json:"enabled"`
    Variants    []Variant `json:"variants"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}

// ABTestResult represents the assigned variant for a user
type ABTestResult struct {
    TestName    string `json:"test_name"`
    VariantName string `json:"variant_name"`
    UserID      string `json:"user_id"`
}

// ABTestManager manages A/B tests
type ABTestManager struct {
    mu    sync.RWMutex
    tests map[string]*ABTest

    // Optional: Track assignments for analytics
    assignments map[string]map[string]string // testName -> userID -> variant
}

// NewABTestManager creates a new ABTestManager
func NewABTestManager() *ABTestManager {
    return &ABTestManager{
        tests:       make(map[string]*ABTest),
        assignments: make(map[string]map[string]string),
    }
}

// CreateTest registers a new A/B test
func (am *ABTestManager) CreateTest(name, description string, variants []Variant) error {
    am.mu.Lock()
    defer am.mu.Unlock()

    now := time.Now()
    am.tests[name] = &ABTest{
        Name:        name,
        Description: description,
        Enabled:     true,
        Variants:    variants,
        CreatedAt:   now,
        UpdatedAt:   now,
    }
    am.assignments[name] = make(map[string]string)
    return nil
}

// GetVariant returns the variant assigned to a user for a test
func (am *ABTestManager) GetVariant(testName, userID string) *ABTestResult {
    am.mu.RLock()
    test, exists := am.tests[testName]
    if !exists || !test.Enabled || len(test.Variants) == 0 {
        am.mu.RUnlock()
        return nil
    }

    // Check if user already has an assignment
    if variant, ok := am.assignments[testName][userID]; ok {
        am.mu.RUnlock()
        return &ABTestResult{
            TestName:    testName,
            VariantName: variant,
            UserID:      userID,
        }
    }
    am.mu.RUnlock()

    // Calculate variant based on consistent hashing
    variant := am.assignVariant(test, userID)

    // Store assignment
    am.mu.Lock()
    am.assignments[testName][userID] = variant.Name
    am.mu.Unlock()

    return &ABTestResult{
        TestName:    testName,
        VariantName: variant.Name,
        UserID:      userID,
    }
}

// assignVariant uses weighted random selection with consistent hashing
func (am *ABTestManager) assignVariant(test *ABTest, userID string) Variant {
    // Calculate total weight
    totalWeight := 0.0
    for _, v := range test.Variants {
        totalWeight += v.Weight
    }

    // Generate consistent random value for user
    data := test.Name + ":" + userID
    hash := sha256.Sum256([]byte(data))
    num := binary.BigEndian.Uint64(hash[:8])
    randomValue := float64(num%10000) / 10000.0 * totalWeight

    // Select variant based on weight distribution
    cumulative := 0.0
    for _, variant := range test.Variants {
        cumulative += variant.Weight
        if randomValue < cumulative {
            return variant
        }
    }

    // Fallback to last variant
    return test.Variants[len(test.Variants)-1]
}

// GetTestMetrics returns assignment distribution for a test
func (am *ABTestManager) GetTestMetrics(testName string) map[string]int {
    am.mu.RLock()
    defer am.mu.RUnlock()

    metrics := make(map[string]int)
    if assignments, ok := am.assignments[testName]; ok {
        for _, variant := range assignments {
            metrics[variant]++
        }
    }
    return metrics
}

// DisableTest stops an A/B test
func (am *ABTestManager) DisableTest(testName string) {
    am.mu.Lock()
    defer am.mu.Unlock()

    if test, exists := am.tests[testName]; exists {
        test.Enabled = false
        test.UpdatedAt = time.Now()
    }
}
```

### Using A/B Tests

This example demonstrates running an A/B test for a checkout button with three variants.

```go
package main

import (
    "fmt"
    "your-project/featureflags"
)

func main() {
    am := featureflags.NewABTestManager()

    // Create an A/B test for checkout button color
    am.CreateTest("checkout_button_color", "Testing button colors for conversion", []featureflags.Variant{
        {Name: "control", Weight: 50},    // Blue (current)
        {Name: "variant_a", Weight: 25},  // Green
        {Name: "variant_b", Weight: 25},  // Orange
    })

    // Simulate user assignments
    users := []string{"user_001", "user_002", "user_003", "user_004", "user_005",
                      "user_006", "user_007", "user_008", "user_009", "user_010"}

    fmt.Println("Checkout Button A/B Test Assignments:")
    for _, userID := range users {
        result := am.GetVariant("checkout_button_color", userID)
        if result != nil {
            fmt.Printf("  %s -> %s\n", userID, result.VariantName)
        }
    }

    // Verify same user gets same variant
    fmt.Println("\nConsistency Check (user_001):")
    for i := 0; i < 3; i++ {
        result := am.GetVariant("checkout_button_color", "user_001")
        fmt.Printf("  Attempt %d: %s\n", i+1, result.VariantName)
    }

    // Get distribution metrics
    fmt.Println("\nVariant Distribution:")
    metrics := am.GetTestMetrics("checkout_button_color")
    for variant, count := range metrics {
        fmt.Printf("  %s: %d users\n", variant, count)
    }
}

// Example of using A/B test result in your application
func renderCheckoutButton(am *featureflags.ABTestManager, userID string) string {
    result := am.GetVariant("checkout_button_color", userID)
    if result == nil {
        return renderButton("blue") // Default
    }

    switch result.VariantName {
    case "variant_a":
        return renderButton("green")
    case "variant_b":
        return renderButton("orange")
    default:
        return renderButton("blue")
    }
}

func renderButton(color string) string {
    return fmt.Sprintf("<button class=\"btn-%s\">Checkout</button>", color)
}
```

## Integration with LaunchDarkly

LaunchDarkly is a popular enterprise feature flag service. Here is how to integrate it with your Go application.

### Installing LaunchDarkly SDK

First, install the LaunchDarkly Go SDK using go get.

```bash
go get github.com/launchdarkly/go-server-sdk/v6
```

### LaunchDarkly Integration

This wrapper provides a clean interface for LaunchDarkly with proper initialization and context handling.

```go
package featureflags

import (
    "context"
    "log"
    "time"

    "github.com/launchdarkly/go-server-sdk/v6"
    "github.com/launchdarkly/go-server-sdk/v6/ldcomponents"
    ldcontext "github.com/launchdarkly/go-sdk-common/v3/ldcontext"
)

// LaunchDarklyClient wraps the LaunchDarkly SDK
type LaunchDarklyClient struct {
    client *ldclient.LDClient
}

// NewLaunchDarklyClient creates a new LaunchDarkly client
func NewLaunchDarklyClient(sdkKey string) (*LaunchDarklyClient, error) {
    // Configure the client with recommended settings
    config := ldclient.Config{
        Events: ldcomponents.SendEvents(),
    }

    client, err := ldclient.MakeCustomClient(sdkKey, config, 10*time.Second)
    if err != nil {
        return nil, err
    }

    return &LaunchDarklyClient{client: client}, nil
}

// BoolVariation evaluates a boolean feature flag
func (ldc *LaunchDarklyClient) BoolVariation(flagKey string, userKey string, defaultValue bool) bool {
    ctx := ldcontext.New(userKey)
    value, err := ldc.client.BoolVariation(flagKey, ctx, defaultValue)
    if err != nil {
        log.Printf("Error evaluating flag %s: %v", flagKey, err)
        return defaultValue
    }
    return value
}

// BoolVariationWithContext evaluates with additional user attributes
func (ldc *LaunchDarklyClient) BoolVariationWithContext(
    flagKey string,
    userKey string,
    attributes map[string]interface{},
    defaultValue bool,
) bool {
    // Build context with attributes
    builder := ldcontext.NewBuilder(userKey)

    for key, value := range attributes {
        switch v := value.(type) {
        case string:
            builder.SetString(key, v)
        case bool:
            builder.SetBool(key, v)
        case int:
            builder.SetInt(key, v)
        case float64:
            builder.SetFloat64(key, v)
        }
    }

    ctx := builder.Build()
    value, err := ldc.client.BoolVariation(flagKey, ctx, defaultValue)
    if err != nil {
        log.Printf("Error evaluating flag %s: %v", flagKey, err)
        return defaultValue
    }
    return value
}

// StringVariation evaluates a string feature flag
func (ldc *LaunchDarklyClient) StringVariation(flagKey string, userKey string, defaultValue string) string {
    ctx := ldcontext.New(userKey)
    value, err := ldc.client.StringVariation(flagKey, ctx, defaultValue)
    if err != nil {
        log.Printf("Error evaluating flag %s: %v", flagKey, err)
        return defaultValue
    }
    return value
}

// JSONVariation evaluates a JSON feature flag
func (ldc *LaunchDarklyClient) JSONVariation(flagKey string, userKey string, defaultValue interface{}) interface{} {
    ctx := ldcontext.New(userKey)
    value, err := ldc.client.JSONVariation(flagKey, ctx, ldvalue.Parse([]byte("{}")))
    if err != nil {
        log.Printf("Error evaluating flag %s: %v", flagKey, err)
        return defaultValue
    }
    return value
}

// Close shuts down the client
func (ldc *LaunchDarklyClient) Close() error {
    return ldc.client.Close()
}

// IsInitialized returns true if the client has successfully connected
func (ldc *LaunchDarklyClient) IsInitialized() bool {
    return ldc.client.Initialized()
}
```

### Using LaunchDarkly

This example shows basic LaunchDarkly usage with feature flag evaluation.

```go
package main

import (
    "fmt"
    "log"
    "os"
    "your-project/featureflags"
)

func main() {
    sdkKey := os.Getenv("LAUNCHDARKLY_SDK_KEY")

    client, err := featureflags.NewLaunchDarklyClient(sdkKey)
    if err != nil {
        log.Fatalf("Failed to initialize LaunchDarkly: %v", err)
    }
    defer client.Close()

    // Wait for initialization
    if !client.IsInitialized() {
        log.Println("Warning: LaunchDarkly client not fully initialized")
    }

    userID := "user_123"

    // Simple boolean flag
    if client.BoolVariation("new-feature", userID, false) {
        fmt.Println("New feature is enabled!")
    }

    // Flag with user context
    showBeta := client.BoolVariationWithContext("beta-features", userID, map[string]interface{}{
        "email":    "user@example.com",
        "plan":     "enterprise",
        "country":  "US",
    }, false)

    if showBeta {
        fmt.Println("Beta features enabled for this user")
    }

    // String variation for A/B testing
    buttonColor := client.StringVariation("checkout-button-color", userID, "blue")
    fmt.Printf("Button color for user: %s\n", buttonColor)
}
```

## Integration with Unleash

Unleash is an open-source feature flag service that you can self-host. Here is how to integrate it with Go.

### Installing Unleash SDK

Install the Unleash Go client using go get.

```bash
go get github.com/Unleash/unleash-client-go/v4
```

### Unleash Integration

This implementation provides a wrapper for Unleash with support for custom strategies and metrics.

```go
package featureflags

import (
    "time"

    "github.com/Unleash/unleash-client-go/v4"
    "github.com/Unleash/unleash-client-go/v4/context"
)

// UnleashClient wraps the Unleash SDK
type UnleashClient struct {
    appName string
}

// NewUnleashClient initializes Unleash
func NewUnleashClient(appName, url, apiToken string) (*UnleashClient, error) {
    err := unleash.Initialize(
        unleash.WithAppName(appName),
        unleash.WithUrl(url),
        unleash.WithCustomHeaders(map[string]string{
            "Authorization": apiToken,
        }),
        unleash.WithRefreshInterval(15*time.Second),
        unleash.WithMetricsInterval(60*time.Second),
    )
    if err != nil {
        return nil, err
    }

    // Wait for initialization
    unleash.WaitForReady()

    return &UnleashClient{appName: appName}, nil
}

// IsEnabled checks if a feature is enabled
func (uc *UnleashClient) IsEnabled(featureName string) bool {
    return unleash.IsEnabled(featureName)
}

// IsEnabledForUser checks if a feature is enabled for a specific user
func (uc *UnleashClient) IsEnabledForUser(featureName, userID string) bool {
    ctx := context.Context{
        UserId: userID,
    }
    return unleash.IsEnabled(featureName, unleash.WithContext(ctx))
}

// IsEnabledWithContext checks with full context
func (uc *UnleashClient) IsEnabledWithContext(featureName string, userID, sessionID string, properties map[string]string) bool {
    ctx := context.Context{
        UserId:     userID,
        SessionId:  sessionID,
        Properties: properties,
    }
    return unleash.IsEnabled(featureName, unleash.WithContext(ctx))
}

// GetVariant returns the variant for a feature
func (uc *UnleashClient) GetVariant(featureName, userID string) *unleash.Variant {
    ctx := context.Context{
        UserId: userID,
    }
    return unleash.GetVariant(featureName, unleash.WithVariantContext(ctx))
}

// Close shuts down the client
func (uc *UnleashClient) Close() error {
    return unleash.Close()
}
```

### Using Unleash

This example demonstrates Unleash usage with user context and variants.

```go
package main

import (
    "fmt"
    "log"
    "os"
    "your-project/featureflags"
)

func main() {
    client, err := featureflags.NewUnleashClient(
        "my-app",
        os.Getenv("UNLEASH_URL"),
        os.Getenv("UNLEASH_API_TOKEN"),
    )
    if err != nil {
        log.Fatalf("Failed to initialize Unleash: %v", err)
    }
    defer client.Close()

    userID := "user_123"

    // Simple feature check
    if client.IsEnabled("dark-mode") {
        fmt.Println("Dark mode is globally enabled")
    }

    // User-specific check
    if client.IsEnabledForUser("premium-features", userID) {
        fmt.Println("Premium features enabled for user")
    }

    // Check with full context
    enabled := client.IsEnabledWithContext("regional-feature", userID, "session_456", map[string]string{
        "country":  "US",
        "platform": "web",
        "version":  "2.0.0",
    })
    fmt.Printf("Regional feature enabled: %v\n", enabled)

    // Get variant for A/B testing
    variant := client.GetVariant("checkout-experiment", userID)
    if variant != nil && variant.Enabled {
        fmt.Printf("User assigned to variant: %s\n", variant.Name)
    }
}
```

## Flag Cleanup and Technical Debt

Feature flags can become technical debt if not properly managed. Here are strategies and tools for keeping your flags clean.

### Flag Lifecycle Manager

This implementation helps track flag age and identify stale flags that should be removed.

```go
package featureflags

import (
    "fmt"
    "sync"
    "time"
)

// FlagStatus represents the lifecycle stage of a flag
type FlagStatus string

const (
    StatusActive     FlagStatus = "active"
    StatusDeprecated FlagStatus = "deprecated"
    StatusStale      FlagStatus = "stale"
    StatusRemoved    FlagStatus = "removed"
)

// ManagedFlag extends Flag with lifecycle metadata
type ManagedFlag struct {
    Name          string     `json:"name"`
    Description   string     `json:"description"`
    Enabled       bool       `json:"enabled"`
    Status        FlagStatus `json:"status"`
    Owner         string     `json:"owner"`
    JiraTicket    string     `json:"jira_ticket"`
    CreatedAt     time.Time  `json:"created_at"`
    UpdatedAt     time.Time  `json:"updated_at"`
    ExpiresAt     time.Time  `json:"expires_at"`
    LastEvaluated time.Time  `json:"last_evaluated"`
    EvalCount     int64      `json:"eval_count"`
}

// FlagLifecycleManager manages flag lifecycle and cleanup
type FlagLifecycleManager struct {
    mu    sync.RWMutex
    flags map[string]*ManagedFlag

    // Configuration
    staleThreshold time.Duration // Duration after which unused flags are stale
}

// NewFlagLifecycleManager creates a new manager
func NewFlagLifecycleManager(staleThreshold time.Duration) *FlagLifecycleManager {
    return &FlagLifecycleManager{
        flags:          make(map[string]*ManagedFlag),
        staleThreshold: staleThreshold,
    }
}

// Register adds a new managed flag
func (flm *FlagLifecycleManager) Register(name, description, owner, jiraTicket string, expiresAt time.Time) {
    flm.mu.Lock()
    defer flm.mu.Unlock()

    now := time.Now()
    flm.flags[name] = &ManagedFlag{
        Name:        name,
        Description: description,
        Enabled:     false,
        Status:      StatusActive,
        Owner:       owner,
        JiraTicket:  jiraTicket,
        CreatedAt:   now,
        UpdatedAt:   now,
        ExpiresAt:   expiresAt,
    }
}

// Evaluate checks a flag and updates usage metrics
func (flm *FlagLifecycleManager) Evaluate(name string) bool {
    flm.mu.Lock()
    defer flm.mu.Unlock()

    flag, exists := flm.flags[name]
    if !exists {
        return false
    }

    // Update usage metrics
    flag.LastEvaluated = time.Now()
    flag.EvalCount++

    return flag.Enabled
}

// GetStaleFlags returns flags that have not been evaluated recently
func (flm *FlagLifecycleManager) GetStaleFlags() []*ManagedFlag {
    flm.mu.RLock()
    defer flm.mu.RUnlock()

    var stale []*ManagedFlag
    cutoff := time.Now().Add(-flm.staleThreshold)

    for _, flag := range flm.flags {
        if flag.Status == StatusActive {
            // Flag is stale if never evaluated or not evaluated recently
            if flag.LastEvaluated.IsZero() || flag.LastEvaluated.Before(cutoff) {
                stale = append(stale, flag)
            }
        }
    }

    return stale
}

// GetExpiredFlags returns flags past their expiration date
func (flm *FlagLifecycleManager) GetExpiredFlags() []*ManagedFlag {
    flm.mu.RLock()
    defer flm.mu.RUnlock()

    var expired []*ManagedFlag
    now := time.Now()

    for _, flag := range flm.flags {
        if flag.Status == StatusActive && !flag.ExpiresAt.IsZero() && flag.ExpiresAt.Before(now) {
            expired = append(expired, flag)
        }
    }

    return expired
}

// Deprecate marks a flag as deprecated
func (flm *FlagLifecycleManager) Deprecate(name string) error {
    flm.mu.Lock()
    defer flm.mu.Unlock()

    flag, exists := flm.flags[name]
    if !exists {
        return fmt.Errorf("flag %s not found", name)
    }

    flag.Status = StatusDeprecated
    flag.UpdatedAt = time.Now()
    return nil
}

// GenerateReport creates a cleanup report
func (flm *FlagLifecycleManager) GenerateReport() string {
    stale := flm.GetStaleFlags()
    expired := flm.GetExpiredFlags()

    report := "=== Feature Flag Cleanup Report ===\n\n"

    report += fmt.Sprintf("Stale Flags (not used in %v):\n", flm.staleThreshold)
    for _, f := range stale {
        report += fmt.Sprintf("  - %s (owner: %s, ticket: %s)\n", f.Name, f.Owner, f.JiraTicket)
    }

    report += "\nExpired Flags:\n"
    for _, f := range expired {
        report += fmt.Sprintf("  - %s (expired: %s, owner: %s)\n",
            f.Name, f.ExpiresAt.Format("2006-01-02"), f.Owner)
    }

    return report
}
```

### Best Practices for Flag Cleanup

Follow these guidelines to prevent feature flag debt from accumulating in your codebase.

```go
package main

import (
    "fmt"
    "time"
    "your-project/featureflags"
)

func main() {
    // Create manager with 30-day stale threshold
    manager := featureflags.NewFlagLifecycleManager(30 * 24 * time.Hour)

    // Register flags with metadata and expiration
    manager.Register(
        "new_payment_flow",
        "Updated payment processing with Stripe v3",
        "payments-team",
        "PAY-1234",
        time.Now().Add(90*24*time.Hour), // Expires in 90 days
    )

    manager.Register(
        "holiday_theme",
        "Special holiday UI theme",
        "frontend-team",
        "FE-5678",
        time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC), // Expires after holidays
    )

    // Simulate usage
    manager.Evaluate("new_payment_flow")

    // Generate cleanup report (run periodically via cron)
    report := manager.GenerateReport()
    fmt.Println(report)
}

// Tips for Managing Feature Flag Debt:
//
// 1. Set Expiration Dates: Always define when a flag should be removed
//
// 2. Assign Owners: Every flag should have a team or person responsible
//
// 3. Link to Tickets: Connect flags to JIRA/GitHub issues for tracking
//
// 4. Regular Audits: Run cleanup reports weekly or monthly
//
// 5. Automate Alerts: Send notifications when flags are stale or expired
//
// 6. Code Reviews: Ensure new flags follow naming conventions and have metadata
//
// 7. Remove Completely: When removing a flag, remove ALL related code paths
//
// 8. Document Decisions: Keep a log of why flags were created and removed
```

## HTTP API for Flag Management

For production systems, you often need an HTTP API to manage flags dynamically. Here is a complete example.

### Flag Management API

This implementation provides a REST API for managing feature flags at runtime.

```go
package main

import (
    "encoding/json"
    "net/http"
    "sync"
    "time"
)

// Flag represents a feature flag
type Flag struct {
    Name        string    `json:"name"`
    Enabled     bool      `json:"enabled"`
    Description string    `json:"description"`
    UpdatedAt   time.Time `json:"updated_at"`
}

// FlagStore is a thread-safe flag storage
type FlagStore struct {
    mu    sync.RWMutex
    flags map[string]*Flag
}

var store = &FlagStore{
    flags: make(map[string]*Flag),
}

func main() {
    // Initialize some flags
    store.flags["feature_x"] = &Flag{
        Name:        "feature_x",
        Enabled:     false,
        Description: "New experimental feature",
        UpdatedAt:   time.Now(),
    }

    // Set up routes
    http.HandleFunc("/flags", handleFlags)
    http.HandleFunc("/flags/", handleFlag)
    http.HandleFunc("/evaluate/", handleEvaluate)

    println("Feature flag server running on :8080")
    http.ListenAndServe(":8080", nil)
}

// handleFlags handles GET (list) and POST (create) for flags
func handleFlags(w http.ResponseWriter, r *http.Request) {
    switch r.Method {
    case http.MethodGet:
        store.mu.RLock()
        flags := make([]*Flag, 0, len(store.flags))
        for _, f := range store.flags {
            flags = append(flags, f)
        }
        store.mu.RUnlock()

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(flags)

    case http.MethodPost:
        var flag Flag
        if err := json.NewDecoder(r.Body).Decode(&flag); err != nil {
            http.Error(w, err.Error(), http.StatusBadRequest)
            return
        }

        flag.UpdatedAt = time.Now()

        store.mu.Lock()
        store.flags[flag.Name] = &flag
        store.mu.Unlock()

        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusCreated)
        json.NewEncoder(w).Encode(flag)

    default:
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
    }
}

// handleFlag handles GET, PUT, DELETE for a specific flag
func handleFlag(w http.ResponseWriter, r *http.Request) {
    name := r.URL.Path[len("/flags/"):]
    if name == "" {
        http.Error(w, "Flag name required", http.StatusBadRequest)
        return
    }

    switch r.Method {
    case http.MethodGet:
        store.mu.RLock()
        flag, exists := store.flags[name]
        store.mu.RUnlock()

        if !exists {
            http.Error(w, "Flag not found", http.StatusNotFound)
            return
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(flag)

    case http.MethodPut:
        var update struct {
            Enabled     *bool   `json:"enabled"`
            Description *string `json:"description"`
        }
        if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
            http.Error(w, err.Error(), http.StatusBadRequest)
            return
        }

        store.mu.Lock()
        flag, exists := store.flags[name]
        if !exists {
            store.mu.Unlock()
            http.Error(w, "Flag not found", http.StatusNotFound)
            return
        }

        if update.Enabled != nil {
            flag.Enabled = *update.Enabled
        }
        if update.Description != nil {
            flag.Description = *update.Description
        }
        flag.UpdatedAt = time.Now()
        store.mu.Unlock()

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(flag)

    case http.MethodDelete:
        store.mu.Lock()
        delete(store.flags, name)
        store.mu.Unlock()

        w.WriteHeader(http.StatusNoContent)

    default:
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
    }
}

// handleEvaluate returns whether a flag is enabled
func handleEvaluate(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    name := r.URL.Path[len("/evaluate/"):]

    store.mu.RLock()
    flag, exists := store.flags[name]
    store.mu.RUnlock()

    result := struct {
        Flag    string `json:"flag"`
        Enabled bool   `json:"enabled"`
    }{
        Flag:    name,
        Enabled: exists && flag.Enabled,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(result)
}
```

## Conclusion

Feature flags are a powerful tool for modern software development, enabling safer deployments, gradual rollouts, and data-driven product decisions through A/B testing. In this guide, we covered:

1. **Basic Implementation**: Simple in-memory feature flags with thread-safe operations
2. **Percentage Rollouts**: Gradual feature releases using consistent hashing
3. **User Targeting**: Advanced segmentation based on user attributes and groups
4. **A/B Testing**: Multi-variant experiments with weighted distribution
5. **Third-Party Integration**: LaunchDarkly and Unleash for enterprise-grade flag management
6. **Flag Lifecycle Management**: Strategies for preventing technical debt

When implementing feature flags, remember these key principles:

- **Start Simple**: Begin with basic boolean flags and add complexity as needed
- **Be Consistent**: Use consistent hashing to ensure users get the same experience
- **Track Everything**: Monitor flag evaluations and clean up stale flags
- **Document Well**: Every flag should have an owner, description, and expiration date
- **Fail Safely**: Default to the safe/existing behavior when flags cannot be evaluated

Feature flags, when used properly, can significantly improve your deployment confidence and enable faster iteration on your Go applications.
