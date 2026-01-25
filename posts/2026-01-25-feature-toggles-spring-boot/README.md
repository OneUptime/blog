# How to Implement Feature Toggles in Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, Feature Toggles, Feature Flags, DevOps

Description: Learn how to implement feature toggles in Spring Boot applications to safely deploy new features, run A/B tests, and control functionality at runtime without redeploying your application.

---

Feature toggles, also called feature flags, have become a fundamental technique in modern software development. They let you deploy code that's hidden behind a switch, giving you control over when features go live - independent of your deployment cycle. This decouples deployment from release, which is incredibly powerful when you're shipping code multiple times a day.

In this guide, I'll walk you through implementing feature toggles in a Spring Boot application. We'll start with a simple approach and then look at more sophisticated options.

## Why Use Feature Toggles?

Before diving into code, let's understand when feature toggles shine:

- **Gradual rollouts**: Release features to 5% of users, then 20%, then everyone
- **A/B testing**: Test different implementations with different user segments
- **Kill switches**: Disable problematic features instantly without a rollback
- **Trunk-based development**: Merge incomplete features safely to main
- **Environment-specific behavior**: Enable features only in staging or for internal users

## The Simple Approach: Configuration Properties

The most straightforward way to implement feature toggles in Spring Boot is through configuration properties. This works well for toggles that don't change frequently.

First, define your feature toggle properties:

```java
// FeatureToggleProperties.java
package com.example.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "features")
public class FeatureToggleProperties {

    // Toggle for the new checkout flow
    private boolean newCheckoutEnabled = false;

    // Toggle for the recommendation engine
    private boolean recommendationsEnabled = false;

    // Toggle for dark mode support
    private boolean darkModeEnabled = false;

    // Getters and setters
    public boolean isNewCheckoutEnabled() {
        return newCheckoutEnabled;
    }

    public void setNewCheckoutEnabled(boolean newCheckoutEnabled) {
        this.newCheckoutEnabled = newCheckoutEnabled;
    }

    public boolean isRecommendationsEnabled() {
        return recommendationsEnabled;
    }

    public void setRecommendationsEnabled(boolean recommendationsEnabled) {
        this.recommendationsEnabled = recommendationsEnabled;
    }

    public boolean isDarkModeEnabled() {
        return darkModeEnabled;
    }

    public void setDarkModeEnabled(boolean darkModeEnabled) {
        this.darkModeEnabled = darkModeEnabled;
    }
}
```

Configure the toggles in your `application.yml`:

```yaml
features:
  new-checkout-enabled: true
  recommendations-enabled: false
  dark-mode-enabled: true
```

Now use them in your services:

```java
// CheckoutService.java
package com.example.service;

import com.example.config.FeatureToggleProperties;
import org.springframework.stereotype.Service;

@Service
public class CheckoutService {

    private final FeatureToggleProperties features;

    public CheckoutService(FeatureToggleProperties features) {
        this.features = features;
    }

    public CheckoutResponse processCheckout(CheckoutRequest request) {
        if (features.isNewCheckoutEnabled()) {
            // New streamlined checkout logic
            return processNewCheckout(request);
        }
        // Legacy checkout flow
        return processLegacyCheckout(request);
    }

    private CheckoutResponse processNewCheckout(CheckoutRequest request) {
        // Implementation of new checkout
        return new CheckoutResponse("new-flow", calculateTotal(request));
    }

    private CheckoutResponse processLegacyCheckout(CheckoutRequest request) {
        // Implementation of legacy checkout
        return new CheckoutResponse("legacy-flow", calculateTotal(request));
    }

    private double calculateTotal(CheckoutRequest request) {
        // Calculate total
        return request.getItems().stream()
            .mapToDouble(item -> item.getPrice() * item.getQuantity())
            .sum();
    }
}
```

## Building a Dynamic Feature Toggle Service

Configuration properties require a restart to change. For toggles you want to flip at runtime, you need something more dynamic. Let's build a toggle service backed by a database.

```java
// FeatureToggle.java - JPA Entity
package com.example.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "feature_toggles")
public class FeatureToggle {

    @Id
    private String name;

    private boolean enabled;

    private String description;

    // Percentage of users who should see this feature (0-100)
    private int rolloutPercentage;

    public FeatureToggle() {}

    public FeatureToggle(String name, boolean enabled, String description) {
        this.name = name;
        this.enabled = enabled;
        this.description = description;
        this.rolloutPercentage = 100;
    }

    // Getters and setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public int getRolloutPercentage() { return rolloutPercentage; }
    public void setRolloutPercentage(int rolloutPercentage) {
        this.rolloutPercentage = rolloutPercentage;
    }
}
```

```java
// FeatureToggleRepository.java
package com.example.repository;

import com.example.entity.FeatureToggle;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeatureToggleRepository extends JpaRepository<FeatureToggle, String> {
}
```

```java
// FeatureToggleService.java
package com.example.service;

import com.example.entity.FeatureToggle;
import com.example.repository.FeatureToggleRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Service
public class FeatureToggleService {

    private final FeatureToggleRepository repository;

    public FeatureToggleService(FeatureToggleRepository repository) {
        this.repository = repository;
    }

    // Cache toggle lookups to avoid hitting the database on every check
    @Cacheable(value = "feature-toggles", key = "#featureName")
    public boolean isEnabled(String featureName) {
        return repository.findById(featureName)
            .map(FeatureToggle::isEnabled)
            .orElse(false); // Default to disabled if toggle doesn't exist
    }

    // Check if feature is enabled for a specific user based on rollout percentage
    @Cacheable(value = "feature-toggles", key = "#featureName + '-' + #userId")
    public boolean isEnabledForUser(String featureName, String userId) {
        return repository.findById(featureName)
            .map(toggle -> {
                if (!toggle.isEnabled()) {
                    return false;
                }
                // Use consistent hashing so the same user always gets the same result
                int userHash = Math.abs(userId.hashCode() % 100);
                return userHash < toggle.getRolloutPercentage();
            })
            .orElse(false);
    }

    // Clear cache when a toggle is updated
    @CacheEvict(value = "feature-toggles", allEntries = true)
    public FeatureToggle updateToggle(String name, boolean enabled, int rolloutPercentage) {
        FeatureToggle toggle = repository.findById(name)
            .orElseThrow(() -> new IllegalArgumentException("Toggle not found: " + name));
        toggle.setEnabled(enabled);
        toggle.setRolloutPercentage(rolloutPercentage);
        return repository.save(toggle);
    }
}
```

## Creating a Custom Annotation for Cleaner Code

Checking feature toggles manually works, but annotations make your code cleaner and more declarative. Let's create a custom annotation with AOP.

```java
// FeatureEnabled.java - Custom Annotation
package com.example.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface FeatureEnabled {

    // Name of the feature toggle to check
    String value();

    // What to do if the feature is disabled
    DisabledBehavior onDisabled() default DisabledBehavior.THROW_EXCEPTION;

    enum DisabledBehavior {
        THROW_EXCEPTION,
        RETURN_NULL,
        RETURN_EMPTY
    }
}
```

```java
// FeatureToggleAspect.java
package com.example.aspect;

import com.example.annotation.FeatureEnabled;
import com.example.exception.FeatureDisabledException;
import com.example.service.FeatureToggleService;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Aspect
@Component
public class FeatureToggleAspect {

    private final FeatureToggleService featureToggleService;

    public FeatureToggleAspect(FeatureToggleService featureToggleService) {
        this.featureToggleService = featureToggleService;
    }

    @Around("@annotation(featureEnabled)")
    public Object checkFeatureToggle(ProceedingJoinPoint joinPoint,
                                      FeatureEnabled featureEnabled) throws Throwable {
        String featureName = featureEnabled.value();

        if (featureToggleService.isEnabled(featureName)) {
            // Feature is enabled, proceed with method execution
            return joinPoint.proceed();
        }

        // Feature is disabled, handle based on configured behavior
        return switch (featureEnabled.onDisabled()) {
            case RETURN_NULL -> null;
            case RETURN_EMPTY -> getEmptyValue(joinPoint);
            case THROW_EXCEPTION -> throw new FeatureDisabledException(featureName);
        };
    }

    private Object getEmptyValue(ProceedingJoinPoint joinPoint) {
        Class<?> returnType = ((org.aspectj.lang.reflect.MethodSignature)
            joinPoint.getSignature()).getReturnType();

        if (List.class.isAssignableFrom(returnType)) {
            return Collections.emptyList();
        }
        if (Optional.class.isAssignableFrom(returnType)) {
            return Optional.empty();
        }
        return null;
    }
}
```

Now your service methods become much cleaner:

```java
// RecommendationService.java
package com.example.service;

import com.example.annotation.FeatureEnabled;
import com.example.model.Product;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RecommendationService {

    // This method only executes if the feature is enabled
    // Returns empty list if disabled
    @FeatureEnabled(value = "ai-recommendations",
                    onDisabled = FeatureEnabled.DisabledBehavior.RETURN_EMPTY)
    public List<Product> getPersonalizedRecommendations(String userId) {
        // Complex ML-based recommendation logic
        return fetchRecommendationsFromMLService(userId);
    }

    // Throws exception if feature is disabled
    @FeatureEnabled("premium-analytics")
    public AnalyticsReport generatePremiumReport(String accountId) {
        return buildDetailedAnalytics(accountId);
    }

    private List<Product> fetchRecommendationsFromMLService(String userId) {
        // Implementation
        return List.of();
    }

    private AnalyticsReport buildDetailedAnalytics(String accountId) {
        // Implementation
        return new AnalyticsReport();
    }
}
```

## Exposing Toggles via REST API

You'll want an admin API to manage toggles at runtime:

```java
// FeatureToggleController.java
package com.example.controller;

import com.example.entity.FeatureToggle;
import com.example.repository.FeatureToggleRepository;
import com.example.service.FeatureToggleService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/features")
public class FeatureToggleController {

    private final FeatureToggleRepository repository;
    private final FeatureToggleService toggleService;

    public FeatureToggleController(FeatureToggleRepository repository,
                                    FeatureToggleService toggleService) {
        this.repository = repository;
        this.toggleService = toggleService;
    }

    @GetMapping
    public List<FeatureToggle> getAllToggles() {
        return repository.findAll();
    }

    @GetMapping("/{name}")
    public ResponseEntity<FeatureToggle> getToggle(@PathVariable String name) {
        return repository.findById(name)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{name}")
    public FeatureToggle updateToggle(@PathVariable String name,
                                       @RequestBody ToggleUpdateRequest request) {
        return toggleService.updateToggle(name, request.enabled(),
                                           request.rolloutPercentage());
    }

    @PostMapping
    public FeatureToggle createToggle(@RequestBody FeatureToggle toggle) {
        return repository.save(toggle);
    }

    record ToggleUpdateRequest(boolean enabled, int rolloutPercentage) {}
}
```

## Best Practices and Gotchas

After implementing feature toggles in several production systems, here are lessons I've learned:

**Clean up old toggles**: Feature toggles are technical debt. Once a feature is fully rolled out, remove the toggle and the old code path. Set a calendar reminder.

**Name toggles clearly**: Use descriptive names like `checkout-v2-enabled` rather than `flag1`. Your future self will thank you.

**Default to disabled**: New features should be off by default. This prevents surprises when deploying to production.

**Test both paths**: Your CI pipeline should test the application with toggles both on and off. Untested code paths will break at the worst possible time.

**Keep toggle logic simple**: Avoid complex toggle combinations. If you find yourself writing `if (featureA && !featureB && featureC)`, step back and reconsider your approach.

**Monitor toggle usage**: Log when toggle checks happen and track which code paths execute. This helps with debugging and tells you when a toggle can be removed.

## Conclusion

Feature toggles give you tremendous flexibility in how you release software. Starting with simple configuration properties works for many use cases. As your needs grow, a database-backed solution with caching and gradual rollout support becomes valuable.

The investment in setting up a proper feature toggle system pays off quickly. You'll deploy with more confidence, release features incrementally, and respond to issues without scrambling to roll back code.

Remember that toggles are a means to an end - shipping software safely and quickly. Don't let them become permanent fixtures in your codebase. Use them, benefit from them, and then clean them up.
