# How to Mock External APIs in Go Tests with httptest and gomock

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Testing, Mocking, httptest, gomock

Description: Eliminate flaky tests by mocking external APIs in Go using httptest for HTTP mocking and gomock for interface mocking.

---

Testing code that interacts with external APIs is one of the most challenging aspects of writing reliable tests. Network calls introduce latency, rate limits, and unpredictable failures that make tests flaky and slow. In this comprehensive guide, we will explore how to eliminate these issues using Go's built-in `httptest` package and the popular `gomock` library.

## The Problem with Real Network Calls in Tests

Before diving into solutions, let us understand why testing against real APIs is problematic:

1. **Flakiness**: Network issues, API downtime, or rate limiting cause random test failures
2. **Speed**: Real HTTP calls add significant latency to your test suite
3. **Cost**: Some APIs charge per request, making test runs expensive
4. **Data consistency**: External data changes between test runs, causing unexpected failures
5. **Environment dependency**: Tests require network access and specific API credentials

## Prerequisites

Before we begin, ensure you have the following installed:

- Go 1.21 or later
- Basic understanding of Go testing
- Familiarity with interfaces in Go

Let us start by installing gomock:

```bash
go install go.uber.org/mock/mockgen@latest
```

## Part 1: HTTP API Mocking with httptest

The `net/http/httptest` package is part of Go's standard library and provides utilities for HTTP testing. It allows you to create mock HTTP servers that respond to requests just like real servers would.

### Basic httptest.Server Usage

The following example demonstrates how to create a simple mock server that returns a JSON response:

```go
package weather

import (
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "net/http/httptest"
    "testing"
)

// WeatherResponse represents the API response structure
type WeatherResponse struct {
    City        string  `json:"city"`
    Temperature float64 `json:"temperature"`
    Humidity    int     `json:"humidity"`
    Condition   string  `json:"condition"`
}

// WeatherClient fetches weather data from an external API
type WeatherClient struct {
    BaseURL    string
    HTTPClient *http.Client
}

// GetWeather fetches weather for a given city
func (c *WeatherClient) GetWeather(city string) (*WeatherResponse, error) {
    url := fmt.Sprintf("%s/weather?city=%s", c.BaseURL, city)

    resp, err := c.HTTPClient.Get(url)
    if err != nil {
        return nil, fmt.Errorf("failed to fetch weather: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
    }

    var weather WeatherResponse
    if err := json.NewDecoder(resp.Body).Decode(&weather); err != nil {
        return nil, fmt.Errorf("failed to decode response: %w", err)
    }

    return &weather, nil
}
```

Now let us write a test using httptest.Server:

```go
// TestGetWeather demonstrates basic httptest.Server usage
func TestGetWeather(t *testing.T) {
    // Create a mock server that returns a predefined response
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Verify the request path and query parameters
        if r.URL.Path != "/weather" {
            t.Errorf("expected path /weather, got %s", r.URL.Path)
        }

        city := r.URL.Query().Get("city")
        if city != "London" {
            t.Errorf("expected city=London, got city=%s", city)
        }

        // Return a mock response
        response := WeatherResponse{
            City:        "London",
            Temperature: 15.5,
            Humidity:    75,
            Condition:   "Cloudy",
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(response)
    }))
    defer server.Close() // Always close the server when done

    // Create a client pointing to our mock server
    client := &WeatherClient{
        BaseURL:    server.URL,
        HTTPClient: http.DefaultClient,
    }

    // Execute the test
    weather, err := client.GetWeather("London")
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    // Verify the response
    if weather.City != "London" {
        t.Errorf("expected city London, got %s", weather.City)
    }
    if weather.Temperature != 15.5 {
        t.Errorf("expected temperature 15.5, got %f", weather.Temperature)
    }
}
```

### Creating a Reusable Mock Server

For more complex scenarios, create a configurable mock server that can handle multiple endpoints:

```go
// MockAPIServer provides a configurable mock server for testing
type MockAPIServer struct {
    Server    *httptest.Server
    Responses map[string]MockResponse
    Requests  []RecordedRequest
}

// MockResponse defines how the mock server should respond
type MockResponse struct {
    StatusCode int
    Body       interface{}
    Headers    map[string]string
    Delay      time.Duration
}

// RecordedRequest stores information about received requests
type RecordedRequest struct {
    Method  string
    Path    string
    Headers http.Header
    Body    []byte
}

// NewMockAPIServer creates a new configurable mock server
func NewMockAPIServer() *MockAPIServer {
    mock := &MockAPIServer{
        Responses: make(map[string]MockResponse),
        Requests:  []RecordedRequest{},
    }

    mock.Server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Record the incoming request for later verification
        body, _ := io.ReadAll(r.Body)
        mock.Requests = append(mock.Requests, RecordedRequest{
            Method:  r.Method,
            Path:    r.URL.Path,
            Headers: r.Header.Clone(),
            Body:    body,
        })

        // Look up the configured response
        key := fmt.Sprintf("%s %s", r.Method, r.URL.Path)
        response, exists := mock.Responses[key]
        if !exists {
            w.WriteHeader(http.StatusNotFound)
            w.Write([]byte("no mock configured for this endpoint"))
            return
        }

        // Simulate network latency if configured
        if response.Delay > 0 {
            time.Sleep(response.Delay)
        }

        // Set custom headers
        for key, value := range response.Headers {
            w.Header().Set(key, value)
        }

        // Write the response
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(response.StatusCode)
        json.NewEncoder(w).Encode(response.Body)
    }))

    return mock
}

// AddResponse configures a response for a specific endpoint
func (m *MockAPIServer) AddResponse(method, path string, response MockResponse) {
    key := fmt.Sprintf("%s %s", method, path)
    m.Responses[key] = response
}

// Close shuts down the mock server
func (m *MockAPIServer) Close() {
    m.Server.Close()
}

// GetRequests returns all recorded requests
func (m *MockAPIServer) GetRequests() []RecordedRequest {
    return m.Requests
}
```

### Testing with the Reusable Mock Server

The following test demonstrates using our reusable mock server:

```go
func TestWeatherClientWithMockServer(t *testing.T) {
    // Create and configure the mock server
    mockServer := NewMockAPIServer()
    defer mockServer.Close()

    // Configure the expected response
    mockServer.AddResponse("GET", "/weather", MockResponse{
        StatusCode: http.StatusOK,
        Body: WeatherResponse{
            City:        "Paris",
            Temperature: 22.0,
            Humidity:    60,
            Condition:   "Sunny",
        },
        Headers: map[string]string{
            "X-RateLimit-Remaining": "99",
        },
    })

    // Create client with mock server URL
    client := &WeatherClient{
        BaseURL:    mockServer.Server.URL,
        HTTPClient: http.DefaultClient,
    }

    // Execute the request
    weather, err := client.GetWeather("Paris")
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    // Verify response
    if weather.Condition != "Sunny" {
        t.Errorf("expected Sunny, got %s", weather.Condition)
    }

    // Verify the request was recorded correctly
    requests := mockServer.GetRequests()
    if len(requests) != 1 {
        t.Fatalf("expected 1 request, got %d", len(requests))
    }
    if requests[0].Method != "GET" {
        t.Errorf("expected GET method, got %s", requests[0].Method)
    }
}
```

## Part 2: Interface Mocking with gomock

While `httptest` is excellent for HTTP-level testing, `gomock` excels at mocking Go interfaces. This is particularly useful when you want to test business logic without worrying about HTTP details.

### Defining Interfaces for Mocking

First, define interfaces that represent your external dependencies:

```go
package payment

import "context"

// PaymentResult represents the outcome of a payment attempt
type PaymentResult struct {
    TransactionID string
    Status        string
    Amount        float64
    Currency      string
    Message       string
}

// PaymentRequest contains payment details
type PaymentRequest struct {
    CustomerID string
    Amount     float64
    Currency   string
    CardToken  string
}

// PaymentGateway defines the interface for payment processing
// This interface can be mocked for testing
type PaymentGateway interface {
    ProcessPayment(ctx context.Context, req PaymentRequest) (*PaymentResult, error)
    RefundPayment(ctx context.Context, transactionID string, amount float64) (*PaymentResult, error)
    GetTransactionStatus(ctx context.Context, transactionID string) (*PaymentResult, error)
}

// NotificationService defines the interface for sending notifications
type NotificationService interface {
    SendEmail(ctx context.Context, to, subject, body string) error
    SendSMS(ctx context.Context, phoneNumber, message string) error
}
```

### Generating Mocks with mockgen

Generate mocks using the mockgen command. Add a go:generate directive to automate this:

```go
//go:generate mockgen -destination=mocks/mock_payment.go -package=mocks . PaymentGateway,NotificationService
```

Run the generator:

```bash
go generate ./...
```

This creates mock implementations in the `mocks` directory.

### Using Generated Mocks in Tests

The following example shows how to use gomock to test a payment service:

```go
package payment

import (
    "context"
    "errors"
    "testing"

    "go.uber.org/mock/gomock"
    "yourproject/payment/mocks"
)

// PaymentService orchestrates payment processing
type PaymentService struct {
    Gateway      PaymentGateway
    Notification NotificationService
}

// ProcessOrder handles the complete order payment flow
func (s *PaymentService) ProcessOrder(ctx context.Context, req PaymentRequest, email string) (*PaymentResult, error) {
    // Process the payment
    result, err := s.Gateway.ProcessPayment(ctx, req)
    if err != nil {
        return nil, err
    }

    // Send confirmation email on success
    if result.Status == "success" {
        subject := "Payment Confirmation"
        body := "Your payment of " + result.Currency + " " +
                fmt.Sprintf("%.2f", result.Amount) + " was successful."

        if err := s.Notification.SendEmail(ctx, email, subject, body); err != nil {
            // Log the error but don't fail the transaction
            // The payment was still successful
        }
    }

    return result, nil
}

// TestProcessOrderSuccess tests the happy path of order processing
func TestProcessOrderSuccess(t *testing.T) {
    // Create a new gomock controller
    ctrl := gomock.NewController(t)
    defer ctrl.Finish() // Ensures all expectations are met

    // Create mock instances
    mockGateway := mocks.NewMockPaymentGateway(ctrl)
    mockNotification := mocks.NewMockNotificationService(ctrl)

    // Set up expectations for the payment gateway
    expectedRequest := PaymentRequest{
        CustomerID: "cust-123",
        Amount:     99.99,
        Currency:   "USD",
        CardToken:  "tok_visa",
    }

    expectedResult := &PaymentResult{
        TransactionID: "txn-456",
        Status:        "success",
        Amount:        99.99,
        Currency:      "USD",
        Message:       "Payment processed successfully",
    }

    // Configure the mock to expect specific calls
    mockGateway.EXPECT().
        ProcessPayment(gomock.Any(), expectedRequest).
        Return(expectedResult, nil).
        Times(1)

    // Expect notification to be sent after successful payment
    mockNotification.EXPECT().
        SendEmail(
            gomock.Any(),
            "customer@example.com",
            "Payment Confirmation",
            gomock.Any(), // We don't care about exact body content
        ).
        Return(nil).
        Times(1)

    // Create the service with mocks
    service := &PaymentService{
        Gateway:      mockGateway,
        Notification: mockNotification,
    }

    // Execute the test
    ctx := context.Background()
    result, err := service.ProcessOrder(ctx, expectedRequest, "customer@example.com")

    // Verify results
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if result.TransactionID != "txn-456" {
        t.Errorf("expected transaction ID txn-456, got %s", result.TransactionID)
    }
}
```

### Advanced gomock Matchers

gomock provides powerful matchers for flexible assertions:

```go
func TestProcessOrderWithMatchers(t *testing.T) {
    ctrl := gomock.NewController(t)
    defer ctrl.Finish()

    mockGateway := mocks.NewMockPaymentGateway(ctrl)
    mockNotification := mocks.NewMockNotificationService(ctrl)

    // Use gomock.Any() for parameters you don't care about
    mockGateway.EXPECT().
        ProcessPayment(gomock.Any(), gomock.Any()).
        DoAndReturn(func(ctx context.Context, req PaymentRequest) (*PaymentResult, error) {
            // Custom logic to validate and return response
            if req.Amount <= 0 {
                return nil, errors.New("invalid amount")
            }
            return &PaymentResult{
                TransactionID: "txn-" + req.CustomerID,
                Status:        "success",
                Amount:        req.Amount,
                Currency:      req.Currency,
            }, nil
        })

    mockNotification.EXPECT().
        SendEmail(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
        Return(nil).
        AnyTimes() // Allow any number of calls

    service := &PaymentService{
        Gateway:      mockGateway,
        Notification: mockNotification,
    }

    ctx := context.Background()
    result, err := service.ProcessOrder(ctx, PaymentRequest{
        CustomerID: "test-user",
        Amount:     50.00,
        Currency:   "EUR",
        CardToken:  "tok_test",
    }, "test@example.com")

    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if result.TransactionID != "txn-test-user" {
        t.Errorf("unexpected transaction ID: %s", result.TransactionID)
    }
}
```

### Custom Matchers

Create custom matchers for complex validation scenarios:

```go
// AmountMatcher validates payment amounts within a range
type AmountMatcher struct {
    min, max float64
}

func (m AmountMatcher) Matches(x interface{}) bool {
    req, ok := x.(PaymentRequest)
    if !ok {
        return false
    }
    return req.Amount >= m.min && req.Amount <= m.max
}

func (m AmountMatcher) String() string {
    return fmt.Sprintf("amount between %.2f and %.2f", m.min, m.max)
}

// InAmountRange creates a matcher for payment amount validation
func InAmountRange(min, max float64) gomock.Matcher {
    return AmountMatcher{min: min, max: max}
}

func TestProcessOrderWithCustomMatcher(t *testing.T) {
    ctrl := gomock.NewController(t)
    defer ctrl.Finish()

    mockGateway := mocks.NewMockPaymentGateway(ctrl)
    mockNotification := mocks.NewMockNotificationService(ctrl)

    // Use custom matcher to validate amount range
    mockGateway.EXPECT().
        ProcessPayment(gomock.Any(), InAmountRange(10.00, 1000.00)).
        Return(&PaymentResult{
            TransactionID: "txn-valid",
            Status:        "success",
            Amount:        100.00,
            Currency:      "USD",
        }, nil)

    mockNotification.EXPECT().
        SendEmail(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
        Return(nil)

    service := &PaymentService{
        Gateway:      mockGateway,
        Notification: mockNotification,
    }

    ctx := context.Background()
    _, err := service.ProcessOrder(ctx, PaymentRequest{
        CustomerID: "user-1",
        Amount:     100.00,
        Currency:   "USD",
        CardToken:  "tok_valid",
    }, "user@example.com")

    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
}
```

## Part 3: Recording and Verifying Mock Calls

Proper verification of mock interactions is crucial for ensuring your code behaves correctly.

### Call Order Verification with gomock.InOrder

The following example demonstrates how to verify calls happen in a specific order:

```go
func TestPaymentFlowOrder(t *testing.T) {
    ctrl := gomock.NewController(t)
    defer ctrl.Finish()

    mockGateway := mocks.NewMockPaymentGateway(ctrl)
    mockNotification := mocks.NewMockNotificationService(ctrl)

    // Define the expected call order
    gomock.InOrder(
        // First, process the payment
        mockGateway.EXPECT().
            ProcessPayment(gomock.Any(), gomock.Any()).
            Return(&PaymentResult{
                TransactionID: "txn-ordered",
                Status:        "success",
                Amount:        75.00,
                Currency:      "USD",
            }, nil),

        // Then, send the email notification
        mockNotification.EXPECT().
            SendEmail(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
            Return(nil),
    )

    service := &PaymentService{
        Gateway:      mockGateway,
        Notification: mockNotification,
    }

    ctx := context.Background()
    _, err := service.ProcessOrder(ctx, PaymentRequest{
        CustomerID: "order-test",
        Amount:     75.00,
        Currency:   "USD",
        CardToken:  "tok_order",
    }, "order@example.com")

    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
}
```

### Recording Calls for Post-Test Analysis

Track all calls made to mocks for detailed verification:

```go
// CallRecorder tracks mock invocations for analysis
type CallRecorder struct {
    Calls []CallRecord
    mu    sync.Mutex
}

// CallRecord stores details of a single mock call
type CallRecord struct {
    Method    string
    Arguments []interface{}
    Timestamp time.Time
}

// Record adds a new call to the recorder
func (r *CallRecorder) Record(method string, args ...interface{}) {
    r.mu.Lock()
    defer r.mu.Unlock()
    r.Calls = append(r.Calls, CallRecord{
        Method:    method,
        Arguments: args,
        Timestamp: time.Now(),
    })
}

// GetCalls returns all recorded calls
func (r *CallRecorder) GetCalls() []CallRecord {
    r.mu.Lock()
    defer r.mu.Unlock()
    return append([]CallRecord{}, r.Calls...)
}

// AssertCallCount verifies the expected number of calls to a method
func (r *CallRecorder) AssertCallCount(t *testing.T, method string, expected int) {
    t.Helper()
    count := 0
    for _, call := range r.GetCalls() {
        if call.Method == method {
            count++
        }
    }
    if count != expected {
        t.Errorf("expected %d calls to %s, got %d", expected, method, count)
    }
}
```

## Part 4: Mocking Error Scenarios

Testing error handling is just as important as testing the happy path. Here is how to mock various error conditions:

### Network Errors

Simulate network failures using httptest:

```go
func TestWeatherClientNetworkError(t *testing.T) {
    // Create a server that immediately closes connections
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Simulate a connection reset
        hj, ok := w.(http.Hijacker)
        if !ok {
            t.Fatal("server doesn't support hijacking")
        }
        conn, _, err := hj.Hijack()
        if err != nil {
            t.Fatal(err)
        }
        conn.Close() // Abruptly close the connection
    }))
    defer server.Close()

    client := &WeatherClient{
        BaseURL:    server.URL,
        HTTPClient: http.DefaultClient,
    }

    _, err := client.GetWeather("London")
    if err == nil {
        t.Error("expected error for network failure, got nil")
    }
}
```

### Timeout Errors

Test how your code handles slow responses:

```go
func TestWeatherClientTimeout(t *testing.T) {
    // Create a slow server
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        time.Sleep(5 * time.Second) // Simulate slow response
        w.WriteHeader(http.StatusOK)
    }))
    defer server.Close()

    // Create a client with a short timeout
    httpClient := &http.Client{
        Timeout: 100 * time.Millisecond,
    }

    client := &WeatherClient{
        BaseURL:    server.URL,
        HTTPClient: httpClient,
    }

    _, err := client.GetWeather("London")
    if err == nil {
        t.Error("expected timeout error, got nil")
    }

    // Verify it's actually a timeout error
    if !errors.Is(err, context.DeadlineExceeded) && !strings.Contains(err.Error(), "timeout") {
        t.Errorf("expected timeout error, got: %v", err)
    }
}
```

### HTTP Error Status Codes

Test handling of various HTTP error responses:

```go
func TestWeatherClientHTTPErrors(t *testing.T) {
    testCases := []struct {
        name           string
        statusCode     int
        expectedError  string
    }{
        {"NotFound", http.StatusNotFound, "unexpected status code: 404"},
        {"InternalServerError", http.StatusInternalServerError, "unexpected status code: 500"},
        {"ServiceUnavailable", http.StatusServiceUnavailable, "unexpected status code: 503"},
        {"TooManyRequests", http.StatusTooManyRequests, "unexpected status code: 429"},
        {"Unauthorized", http.StatusUnauthorized, "unexpected status code: 401"},
    }

    for _, tc := range testCases {
        t.Run(tc.name, func(t *testing.T) {
            server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                w.WriteHeader(tc.statusCode)
            }))
            defer server.Close()

            client := &WeatherClient{
                BaseURL:    server.URL,
                HTTPClient: http.DefaultClient,
            }

            _, err := client.GetWeather("London")
            if err == nil {
                t.Errorf("expected error for status %d, got nil", tc.statusCode)
            }
            if !strings.Contains(err.Error(), tc.expectedError) {
                t.Errorf("expected error containing %q, got %q", tc.expectedError, err.Error())
            }
        })
    }
}
```

### Error Scenarios with gomock

Mock interface errors for comprehensive testing:

```go
func TestProcessOrderPaymentFailure(t *testing.T) {
    ctrl := gomock.NewController(t)
    defer ctrl.Finish()

    mockGateway := mocks.NewMockPaymentGateway(ctrl)
    mockNotification := mocks.NewMockNotificationService(ctrl)

    // Simulate a payment failure
    mockGateway.EXPECT().
        ProcessPayment(gomock.Any(), gomock.Any()).
        Return(nil, errors.New("card declined: insufficient funds"))

    // Notification should NOT be called when payment fails
    // If it is called, the test will fail because we haven't set an expectation

    service := &PaymentService{
        Gateway:      mockGateway,
        Notification: mockNotification,
    }

    ctx := context.Background()
    _, err := service.ProcessOrder(ctx, PaymentRequest{
        CustomerID: "broke-user",
        Amount:     1000.00,
        Currency:   "USD",
        CardToken:  "tok_declined",
    }, "broke@example.com")

    if err == nil {
        t.Error("expected error for declined card, got nil")
    }
    if !strings.Contains(err.Error(), "insufficient funds") {
        t.Errorf("expected insufficient funds error, got: %v", err)
    }
}

func TestProcessOrderNotificationFailure(t *testing.T) {
    ctrl := gomock.NewController(t)
    defer ctrl.Finish()

    mockGateway := mocks.NewMockPaymentGateway(ctrl)
    mockNotification := mocks.NewMockNotificationService(ctrl)

    // Payment succeeds
    mockGateway.EXPECT().
        ProcessPayment(gomock.Any(), gomock.Any()).
        Return(&PaymentResult{
            TransactionID: "txn-success",
            Status:        "success",
            Amount:        50.00,
            Currency:      "USD",
        }, nil)

    // But notification fails
    mockNotification.EXPECT().
        SendEmail(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
        Return(errors.New("SMTP server unavailable"))

    service := &PaymentService{
        Gateway:      mockGateway,
        Notification: mockNotification,
    }

    ctx := context.Background()
    result, err := service.ProcessOrder(ctx, PaymentRequest{
        CustomerID: "user-notify-fail",
        Amount:     50.00,
        Currency:   "USD",
        CardToken:  "tok_valid",
    }, "user@example.com")

    // Payment should still succeed even if notification fails
    if err != nil {
        t.Errorf("payment should succeed despite notification failure: %v", err)
    }
    if result.TransactionID != "txn-success" {
        t.Errorf("expected successful transaction, got: %s", result.TransactionID)
    }
}
```

## Part 5: Best Practices for Test Isolation

Following best practices ensures your tests are reliable, maintainable, and fast.

### 1. Use Dependency Injection

Design your code to accept dependencies through interfaces:

```go
// Good: Dependencies are injected
type OrderService struct {
    paymentGateway PaymentGateway
    inventory      InventoryService
    notifications  NotificationService
}

func NewOrderService(pg PaymentGateway, inv InventoryService, notif NotificationService) *OrderService {
    return &OrderService{
        paymentGateway: pg,
        inventory:      inv,
        notifications:  notif,
    }
}

// Bad: Dependencies are hardcoded
type BadOrderService struct {
    // No way to inject mocks
}

func (s *BadOrderService) ProcessOrder() error {
    // Directly creates HTTP client - cannot be mocked
    client := &http.Client{}
    resp, err := client.Get("https://api.payment.com/process")
    // ...
}
```

### 2. Create Test Fixtures

Use fixture functions to reduce test boilerplate:

```go
// testFixtures provides common test setup
type testFixtures struct {
    ctrl            *gomock.Controller
    mockGateway     *mocks.MockPaymentGateway
    mockNotification *mocks.MockNotificationService
    service         *PaymentService
}

// setupTestFixtures creates all necessary mocks and the service
func setupTestFixtures(t *testing.T) *testFixtures {
    ctrl := gomock.NewController(t)

    mockGateway := mocks.NewMockPaymentGateway(ctrl)
    mockNotification := mocks.NewMockNotificationService(ctrl)

    service := &PaymentService{
        Gateway:      mockGateway,
        Notification: mockNotification,
    }

    return &testFixtures{
        ctrl:             ctrl,
        mockGateway:      mockGateway,
        mockNotification: mockNotification,
        service:          service,
    }
}

// cleanup releases resources
func (f *testFixtures) cleanup() {
    f.ctrl.Finish()
}

// Example usage in tests
func TestWithFixtures(t *testing.T) {
    f := setupTestFixtures(t)
    defer f.cleanup()

    f.mockGateway.EXPECT().
        ProcessPayment(gomock.Any(), gomock.Any()).
        Return(&PaymentResult{Status: "success"}, nil)

    f.mockNotification.EXPECT().
        SendEmail(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
        Return(nil)

    // Use f.service for testing
}
```

### 3. Use Table-Driven Tests

Combine mocking with table-driven tests for comprehensive coverage:

```go
func TestPaymentScenarios(t *testing.T) {
    scenarios := []struct {
        name              string
        paymentRequest    PaymentRequest
        gatewayResponse   *PaymentResult
        gatewayError      error
        notifyError       error
        expectError       bool
        expectNotification bool
    }{
        {
            name: "successful payment",
            paymentRequest: PaymentRequest{
                CustomerID: "user-1",
                Amount:     100.00,
                Currency:   "USD",
                CardToken:  "tok_valid",
            },
            gatewayResponse: &PaymentResult{
                TransactionID: "txn-1",
                Status:        "success",
                Amount:        100.00,
                Currency:      "USD",
            },
            gatewayError:       nil,
            notifyError:        nil,
            expectError:        false,
            expectNotification: true,
        },
        {
            name: "payment declined",
            paymentRequest: PaymentRequest{
                CustomerID: "user-2",
                Amount:     100.00,
                Currency:   "USD",
                CardToken:  "tok_declined",
            },
            gatewayResponse:    nil,
            gatewayError:       errors.New("card declined"),
            notifyError:        nil,
            expectError:        true,
            expectNotification: false,
        },
        {
            name: "failed payment status",
            paymentRequest: PaymentRequest{
                CustomerID: "user-3",
                Amount:     100.00,
                Currency:   "USD",
                CardToken:  "tok_fail",
            },
            gatewayResponse: &PaymentResult{
                TransactionID: "txn-3",
                Status:        "failed",
                Amount:        100.00,
                Currency:      "USD",
            },
            gatewayError:       nil,
            notifyError:        nil,
            expectError:        false,
            expectNotification: false, // No notification for failed payments
        },
    }

    for _, sc := range scenarios {
        t.Run(sc.name, func(t *testing.T) {
            ctrl := gomock.NewController(t)
            defer ctrl.Finish()

            mockGateway := mocks.NewMockPaymentGateway(ctrl)
            mockNotification := mocks.NewMockNotificationService(ctrl)

            // Set up gateway expectation
            mockGateway.EXPECT().
                ProcessPayment(gomock.Any(), sc.paymentRequest).
                Return(sc.gatewayResponse, sc.gatewayError)

            // Set up notification expectation only if expected
            if sc.expectNotification {
                mockNotification.EXPECT().
                    SendEmail(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
                    Return(sc.notifyError)
            }

            service := &PaymentService{
                Gateway:      mockGateway,
                Notification: mockNotification,
            }

            ctx := context.Background()
            _, err := service.ProcessOrder(ctx, sc.paymentRequest, "test@example.com")

            if sc.expectError && err == nil {
                t.Error("expected error but got nil")
            }
            if !sc.expectError && err != nil {
                t.Errorf("unexpected error: %v", err)
            }
        })
    }
}
```

### 4. Isolate Test State

Ensure each test runs in complete isolation:

```go
func TestIsolatedState(t *testing.T) {
    // Each test should create its own mock server
    // Never share mock servers between tests

    t.Run("test1", func(t *testing.T) {
        server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            w.Write([]byte(`{"value": 1}`))
        }))
        defer server.Close()
        // Test using server
    })

    t.Run("test2", func(t *testing.T) {
        server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            w.Write([]byte(`{"value": 2}`))
        }))
        defer server.Close()
        // Test using server
    })
}
```

### 5. Use Parallel Tests Safely

When running tests in parallel, ensure proper mock isolation:

```go
func TestParallelSafety(t *testing.T) {
    t.Parallel() // Mark test as safe for parallel execution

    // Each parallel test gets its own mock controller
    ctrl := gomock.NewController(t)
    defer ctrl.Finish()

    mockGateway := mocks.NewMockPaymentGateway(ctrl)

    // Configure mock for this specific test
    mockGateway.EXPECT().
        ProcessPayment(gomock.Any(), gomock.Any()).
        Return(&PaymentResult{Status: "success"}, nil)

    // Run test logic
}
```

## Conclusion

Mocking external APIs is essential for building a reliable and fast test suite. By using `httptest` for HTTP-level mocking and `gomock` for interface mocking, you can:

- **Eliminate flakiness** caused by network issues and external service availability
- **Improve test speed** by removing actual network calls
- **Test edge cases** that are difficult to reproduce with real APIs
- **Reduce costs** by not hitting rate-limited or paid APIs during testing

Key takeaways:

1. Design for testability by using interfaces and dependency injection
2. Use `httptest.Server` when you need to test HTTP request/response handling
3. Use `gomock` when testing business logic that depends on interfaces
4. Always test error scenarios, not just the happy path
5. Keep tests isolated and avoid sharing state between tests

By following these practices, you will build a test suite that is reliable, maintainable, and gives you confidence in your code's correctness.

## Additional Resources

- [Go httptest documentation](https://pkg.go.dev/net/http/httptest)
- [gomock GitHub repository](https://github.com/uber-go/mock)
- [Go testing best practices](https://go.dev/doc/tutorial/add-a-test)
- [Effective Go - Testing](https://go.dev/doc/effective_go#testing)
