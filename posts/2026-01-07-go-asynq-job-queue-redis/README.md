# How to Build a Job Queue in Go with Asynq and Redis

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Redis, Job Queue, Background Jobs, Async

Description: Build robust job queues in Go using Asynq and Redis with support for delayed jobs, automatic retries, priorities, and dead letter queue handling.

---

Background job processing is essential for building scalable applications. Whether you need to send emails, process images, generate reports, or handle webhooks, offloading these tasks to a background queue keeps your main application responsive and resilient.

In this comprehensive guide, we will build a production-ready job queue system in Go using Asynq, a simple and reliable distributed task queue library backed by Redis. We will cover everything from basic setup to advanced features like delayed jobs, retry policies, priority queues, and dead letter queue handling.

## Why Asynq?

Asynq stands out among Go job queue libraries for several reasons:

- **Simple API**: Clean and intuitive interface that follows Go idioms
- **Redis-backed**: Leverages Redis for reliable message persistence and distribution
- **Feature-rich**: Supports delayed tasks, retries, priorities, unique tasks, and more
- **Observable**: Built-in web UI for monitoring and managing tasks
- **Battle-tested**: Used in production by many companies

## Prerequisites

Before we begin, ensure you have:

- Go 1.21 or later installed
- Redis server running locally or accessible remotely
- Basic familiarity with Go modules

## Project Setup

Let us start by creating a new Go project and installing the required dependencies.

```bash
# Create a new directory for our project
mkdir go-job-queue
cd go-job-queue

# Initialize Go module
go mod init github.com/yourusername/go-job-queue

# Install Asynq and related packages
go get github.com/hibiken/asynq
go get github.com/hibiken/asynq/x/metrics
go get github.com/redis/go-redis/v9
```

## Project Structure

We will organize our code into a clean structure that separates concerns.

```
go-job-queue/
├── cmd/
│   ├── client/
│   │   └── main.go      # Task producer/enqueuer
│   └── worker/
│       └── main.go      # Task consumer/processor
├── internal/
│   ├── tasks/
│   │   ├── types.go     # Task type definitions
│   │   ├── handlers.go  # Task handlers
│   │   └── payloads.go  # Task payload structures
│   └── config/
│       └── redis.go     # Redis configuration
├── go.mod
└── go.sum
```

## Redis Configuration

First, let us create a reusable Redis configuration that both our client and worker will use.

```go
// internal/config/redis.go
package config

import (
	"os"

	"github.com/hibiken/asynq"
)

// RedisConfig holds the Redis connection configuration.
// We use environment variables for flexibility across environments.
func GetRedisClientOpt() asynq.RedisClientOpt {
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	redisPassword := os.Getenv("REDIS_PASSWORD")
	redisDB := 0 // Use database 0 by default

	return asynq.RedisClientOpt{
		Addr:     redisAddr,
		Password: redisPassword,
		DB:       redisDB,
	}
}

// GetRedisClusterClientOpt returns configuration for Redis Cluster.
// Use this for high-availability production deployments.
func GetRedisClusterClientOpt() asynq.RedisClusterClientOpt {
	return asynq.RedisClusterClientOpt{
		Addrs: []string{
			"redis-node-1:6379",
			"redis-node-2:6379",
			"redis-node-3:6379",
		},
	}
}
```

## Defining Task Types and Payloads

Now let us define our task types and their corresponding payload structures. Clear type definitions make our code more maintainable.

```go
// internal/tasks/types.go
package tasks

// Task type constants define the different kinds of jobs our system can process.
// Using constants prevents typos and makes refactoring easier.
const (
	// TypeEmailDelivery is for sending emails to users
	TypeEmailDelivery = "email:deliver"

	// TypeImageResize is for resizing uploaded images
	TypeImageResize = "image:resize"

	// TypeWebhookDelivery is for sending webhooks to external services
	TypeWebhookDelivery = "webhook:deliver"

	// TypeReportGeneration is for generating PDF/Excel reports
	TypeReportGeneration = "report:generate"

	// TypeDataSync is for synchronizing data with external systems
	TypeDataSync = "data:sync"
)
```

Next, we define the payload structures for each task type.

```go
// internal/tasks/payloads.go
package tasks

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hibiken/asynq"
)

// EmailDeliveryPayload contains all information needed to send an email.
type EmailDeliveryPayload struct {
	UserID     int64    `json:"user_id"`
	To         string   `json:"to"`
	Subject    string   `json:"subject"`
	Body       string   `json:"body"`
	TemplateID string   `json:"template_id,omitempty"`
	Attachments []string `json:"attachments,omitempty"`
}

// NewEmailDeliveryTask creates a new email delivery task with the given payload.
// This is the primary way to enqueue email jobs.
func NewEmailDeliveryTask(payload EmailDeliveryPayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal email payload: %w", err)
	}

	// asynq.Task is immutable and contains the task type and payload
	return asynq.NewTask(TypeEmailDelivery, data), nil
}

// ImageResizePayload contains parameters for image processing jobs.
type ImageResizePayload struct {
	ImageID     string `json:"image_id"`
	SourceURL   string `json:"source_url"`
	TargetWidth int    `json:"target_width"`
	TargetHeight int   `json:"target_height"`
	Quality     int    `json:"quality"`
	Format      string `json:"format"` // jpeg, png, webp
}

// NewImageResizeTask creates a new image resize task.
func NewImageResizeTask(payload ImageResizePayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal image payload: %w", err)
	}

	return asynq.NewTask(TypeImageResize, data), nil
}

// WebhookDeliveryPayload contains webhook delivery information.
type WebhookDeliveryPayload struct {
	WebhookID   string            `json:"webhook_id"`
	URL         string            `json:"url"`
	Method      string            `json:"method"`
	Headers     map[string]string `json:"headers"`
	Body        json.RawMessage   `json:"body"`
	Timeout     time.Duration     `json:"timeout"`
	RetryCount  int               `json:"retry_count"`
}

// NewWebhookDeliveryTask creates a new webhook delivery task.
func NewWebhookDeliveryTask(payload WebhookDeliveryPayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal webhook payload: %w", err)
	}

	return asynq.NewTask(TypeWebhookDelivery, data), nil
}

// ReportGenerationPayload contains parameters for report generation.
type ReportGenerationPayload struct {
	ReportID   string                 `json:"report_id"`
	ReportType string                 `json:"report_type"`
	UserID     int64                  `json:"user_id"`
	Parameters map[string]interface{} `json:"parameters"`
	Format     string                 `json:"format"` // pdf, xlsx, csv
	StartDate  time.Time              `json:"start_date"`
	EndDate    time.Time              `json:"end_date"`
}

// NewReportGenerationTask creates a new report generation task.
func NewReportGenerationTask(payload ReportGenerationPayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal report payload: %w", err)
	}

	return asynq.NewTask(TypeReportGeneration, data), nil
}
```

## Implementing Task Handlers

Task handlers contain the actual business logic for processing jobs. Each handler receives a context and task, processes the payload, and returns an error if something goes wrong.

```go
// internal/tasks/handlers.go
package tasks

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/hibiken/asynq"
)

// EmailHandler processes email delivery tasks.
// It implements the asynq.Handler interface.
type EmailHandler struct {
	// In production, inject your email service client here
	// emailClient *sendgrid.Client
}

// ProcessTask handles email delivery.
// Returning nil signals successful completion; returning an error triggers a retry.
func (h *EmailHandler) ProcessTask(ctx context.Context, t *asynq.Task) error {
	var payload EmailDeliveryPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		// Return asynq.SkipRetry to prevent retrying on permanent errors
		return fmt.Errorf("failed to unmarshal payload: %w: %v", asynq.SkipRetry, err)
	}

	log.Printf("Processing email delivery: to=%s, subject=%s", payload.To, payload.Subject)

	// Simulate email sending (replace with actual email service call)
	// err := h.emailClient.Send(ctx, payload.To, payload.Subject, payload.Body)
	time.Sleep(100 * time.Millisecond) // Simulated work

	log.Printf("Email sent successfully to %s", payload.To)
	return nil
}

// ImageHandler processes image resize tasks.
type ImageHandler struct {
	// In production, inject your image processing service
	// imageProcessor *imaging.Processor
}

// ProcessTask handles image resizing operations.
func (h *ImageHandler) ProcessTask(ctx context.Context, t *asynq.Task) error {
	var payload ImageResizePayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal payload: %w: %v", asynq.SkipRetry, err)
	}

	log.Printf("Processing image resize: id=%s, dimensions=%dx%d",
		payload.ImageID, payload.TargetWidth, payload.TargetHeight)

	// Check context for cancellation (important for long-running tasks)
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}

	// Simulate image processing
	time.Sleep(500 * time.Millisecond)

	log.Printf("Image %s resized successfully", payload.ImageID)
	return nil
}

// WebhookHandler processes webhook delivery tasks.
type WebhookHandler struct {
	httpClient *http.Client
}

// NewWebhookHandler creates a new webhook handler with a configured HTTP client.
func NewWebhookHandler() *WebhookHandler {
	return &WebhookHandler{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// ProcessTask handles webhook delivery with proper error handling.
func (h *WebhookHandler) ProcessTask(ctx context.Context, t *asynq.Task) error {
	var payload WebhookDeliveryPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal payload: %w: %v", asynq.SkipRetry, err)
	}

	log.Printf("Delivering webhook: id=%s, url=%s", payload.WebhookID, payload.URL)

	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, payload.Method, payload.URL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w: %v", asynq.SkipRetry, err)
	}

	// Add headers
	for key, value := range payload.Headers {
		req.Header.Set(key, value)
	}

	// Execute request
	resp, err := h.httpClient.Do(req)
	if err != nil {
		// Network errors should be retried
		return fmt.Errorf("webhook request failed: %w", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode >= 500 {
		// Server errors should be retried
		return fmt.Errorf("webhook returned server error: %d", resp.StatusCode)
	}

	if resp.StatusCode >= 400 {
		// Client errors (4xx) should not be retried
		return fmt.Errorf("webhook returned client error: %d: %w", resp.StatusCode, asynq.SkipRetry)
	}

	log.Printf("Webhook %s delivered successfully", payload.WebhookID)
	return nil
}

// ReportHandler processes report generation tasks.
type ReportHandler struct{}

// ProcessTask handles report generation.
func (h *ReportHandler) ProcessTask(ctx context.Context, t *asynq.Task) error {
	var payload ReportGenerationPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal payload: %w: %v", asynq.SkipRetry, err)
	}

	log.Printf("Generating report: id=%s, type=%s, format=%s",
		payload.ReportID, payload.ReportType, payload.Format)

	// Report generation might take a while; check for cancellation periodically
	for i := 0; i < 5; i++ {
		select {
		case <-ctx.Done():
			log.Printf("Report generation cancelled for %s", payload.ReportID)
			return ctx.Err()
		default:
			time.Sleep(200 * time.Millisecond) // Simulated work
		}
	}

	log.Printf("Report %s generated successfully", payload.ReportID)
	return nil
}
```

## Creating the Worker Server

The worker server listens for tasks and routes them to appropriate handlers. This is where we configure concurrency, queues, and middleware.

```go
// cmd/worker/main.go
package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/hibiken/asynq"
	"github.com/yourusername/go-job-queue/internal/config"
	"github.com/yourusername/go-job-queue/internal/tasks"
)

func main() {
	// Create the Asynq server with our Redis configuration
	srv := asynq.NewServer(
		config.GetRedisClientOpt(),
		asynq.Config{
			// Concurrency specifies the maximum number of concurrent workers
			Concurrency: 10,

			// Queues is a map of queue names to their priority weights
			// Higher weight means the queue is processed more frequently
			Queues: map[string]int{
				"critical": 6, // Highest priority - processed 6x more often
				"default":  3, // Standard priority
				"low":      1, // Lowest priority - processed least often
			},

			// StrictPriority ensures higher priority queues are always processed first
			// When true, lower priority queues are only processed when higher ones are empty
			StrictPriority: true,

			// ShutdownTimeout specifies how long to wait for active tasks to complete
			ShutdownTimeout: 30 * time.Second,

			// Logger for Asynq internal logging
			Logger: NewAsynqLogger(),

			// ErrorHandler is called when a task fails after all retries
			ErrorHandler: asynq.ErrorHandlerFunc(handleError),

			// RetryDelayFunc customizes the delay between retries
			RetryDelayFunc: customRetryDelay,

			// HealthCheckFunc is called periodically to check worker health
			HealthCheckFunc: func(err error) {
				if err != nil {
					log.Printf("Health check failed: %v", err)
				}
			},

			// HealthCheckInterval specifies how often to run health checks
			HealthCheckInterval: 15 * time.Second,
		},
	)

	// Create a ServeMux to route tasks to handlers
	mux := asynq.NewServeMux()

	// Use middleware for cross-cutting concerns
	mux.Use(loggingMiddleware)
	mux.Use(recoveryMiddleware)

	// Register task handlers
	mux.Handle(tasks.TypeEmailDelivery, &tasks.EmailHandler{})
	mux.Handle(tasks.TypeImageResize, &tasks.ImageHandler{})
	mux.Handle(tasks.TypeWebhookDelivery, tasks.NewWebhookHandler())
	mux.Handle(tasks.TypeReportGeneration, &tasks.ReportHandler{})

	// Handle graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGTERM, syscall.SIGINT)
		<-sigCh
		log.Println("Received shutdown signal, initiating graceful shutdown...")
		cancel()
	}()

	// Start the server
	log.Println("Starting Asynq worker server...")
	if err := srv.Run(mux); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}

// handleError is called when a task exhausts all retries.
func handleError(ctx context.Context, task *asynq.Task, err error) {
	log.Printf("Task %s failed after all retries: %v", task.Type(), err)

	// Here you might want to:
	// - Send an alert to your monitoring system
	// - Log to a dead letter queue table in your database
	// - Notify administrators via Slack/PagerDuty
}

// customRetryDelay implements exponential backoff with jitter.
func customRetryDelay(n int, err error, task *asynq.Task) time.Duration {
	// Exponential backoff: 1s, 2s, 4s, 8s, 16s, capped at 1 hour
	delay := time.Duration(1<<uint(n-1)) * time.Second
	maxDelay := 1 * time.Hour

	if delay > maxDelay {
		delay = maxDelay
	}

	return delay
}

// loggingMiddleware logs task execution details.
func loggingMiddleware(h asynq.Handler) asynq.Handler {
	return asynq.HandlerFunc(func(ctx context.Context, t *asynq.Task) error {
		start := time.Now()
		log.Printf("Starting task: type=%s", t.Type())

		err := h.ProcessTask(ctx, t)

		duration := time.Since(start)
		if err != nil {
			log.Printf("Task failed: type=%s, duration=%v, error=%v", t.Type(), duration, err)
		} else {
			log.Printf("Task completed: type=%s, duration=%v", t.Type(), duration)
		}

		return err
	})
}

// recoveryMiddleware recovers from panics and converts them to errors.
func recoveryMiddleware(h asynq.Handler) asynq.Handler {
	return asynq.HandlerFunc(func(ctx context.Context, t *asynq.Task) (err error) {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("Panic recovered in task %s: %v", t.Type(), r)
				err = fmt.Errorf("panic: %v", r)
			}
		}()

		return h.ProcessTask(ctx, t)
	})
}

// AsynqLogger implements the asynq.Logger interface.
type AsynqLogger struct{}

func NewAsynqLogger() *AsynqLogger {
	return &AsynqLogger{}
}

func (l *AsynqLogger) Debug(args ...interface{}) {
	log.Println(args...)
}

func (l *AsynqLogger) Info(args ...interface{}) {
	log.Println(args...)
}

func (l *AsynqLogger) Warn(args ...interface{}) {
	log.Println(args...)
}

func (l *AsynqLogger) Error(args ...interface{}) {
	log.Println(args...)
}

func (l *AsynqLogger) Fatal(args ...interface{}) {
	log.Fatal(args...)
}
```

## Creating the Client (Task Producer)

The client is responsible for creating and enqueueing tasks. Let us build a comprehensive client that demonstrates all the key features.

```go
// cmd/client/main.go
package main

import (
	"fmt"
	"log"
	"time"

	"github.com/hibiken/asynq"
	"github.com/yourusername/go-job-queue/internal/config"
	"github.com/yourusername/go-job-queue/internal/tasks"
)

func main() {
	// Create an Asynq client
	client := asynq.NewClient(config.GetRedisClientOpt())
	defer client.Close()

	// Example 1: Basic task enqueueing
	enqueueBasicTask(client)

	// Example 2: Delayed/scheduled tasks
	enqueueDelayedTask(client)

	// Example 3: Tasks with custom retry options
	enqueueTaskWithRetries(client)

	// Example 4: Priority queue tasks
	enqueuePriorityTasks(client)

	// Example 5: Unique tasks (preventing duplicates)
	enqueueUniqueTask(client)

	// Example 6: Task with deadline
	enqueueTaskWithDeadline(client)

	log.Println("All tasks enqueued successfully!")
}

// enqueueBasicTask demonstrates simple task enqueueing.
func enqueueBasicTask(client *asynq.Client) {
	payload := tasks.EmailDeliveryPayload{
		UserID:  12345,
		To:      "user@example.com",
		Subject: "Welcome to our platform!",
		Body:    "Thank you for signing up...",
	}

	task, err := tasks.NewEmailDeliveryTask(payload)
	if err != nil {
		log.Fatalf("Failed to create task: %v", err)
	}

	// Enqueue the task for immediate processing
	info, err := client.Enqueue(task)
	if err != nil {
		log.Fatalf("Failed to enqueue task: %v", err)
	}

	log.Printf("Enqueued basic task: id=%s, queue=%s", info.ID, info.Queue)
}

// enqueueDelayedTask demonstrates scheduling tasks for future execution.
func enqueueDelayedTask(client *asynq.Client) {
	payload := tasks.EmailDeliveryPayload{
		UserID:  12345,
		To:      "user@example.com",
		Subject: "Reminder: Complete your profile",
		Body:    "We noticed you haven't completed your profile...",
	}

	task, err := tasks.NewEmailDeliveryTask(payload)
	if err != nil {
		log.Fatalf("Failed to create task: %v", err)
	}

	// Option 1: Process after a specific delay
	info, err := client.Enqueue(task, asynq.ProcessIn(24*time.Hour))
	if err != nil {
		log.Fatalf("Failed to enqueue delayed task: %v", err)
	}
	log.Printf("Enqueued delayed task (24h): id=%s", info.ID)

	// Option 2: Process at a specific time
	scheduledTime := time.Now().Add(7 * 24 * time.Hour) // One week from now
	info, err = client.Enqueue(task, asynq.ProcessAt(scheduledTime))
	if err != nil {
		log.Fatalf("Failed to enqueue scheduled task: %v", err)
	}
	log.Printf("Enqueued scheduled task: id=%s, scheduled_at=%v", info.ID, scheduledTime)
}

// enqueueTaskWithRetries demonstrates custom retry configuration.
func enqueueTaskWithRetries(client *asynq.Client) {
	payload := tasks.WebhookDeliveryPayload{
		WebhookID: "wh_123",
		URL:       "https://api.partner.com/webhook",
		Method:    "POST",
		Headers: map[string]string{
			"Content-Type":  "application/json",
			"Authorization": "Bearer xxx",
		},
		Body:    []byte(`{"event": "order.created", "data": {}}`),
		Timeout: 10 * time.Second,
	}

	task, err := tasks.NewWebhookDeliveryTask(payload)
	if err != nil {
		log.Fatalf("Failed to create task: %v", err)
	}

	// Configure retry behavior
	info, err := client.Enqueue(task,
		// Maximum number of retry attempts
		asynq.MaxRetry(5),

		// Timeout for each attempt
		asynq.Timeout(30*time.Second),

		// Retention period after completion (for inspection)
		asynq.Retention(24*time.Hour),
	)
	if err != nil {
		log.Fatalf("Failed to enqueue task with retries: %v", err)
	}

	log.Printf("Enqueued task with custom retries: id=%s, max_retry=%d", info.ID, info.MaxRetry)
}

// enqueuePriorityTasks demonstrates using priority queues.
func enqueuePriorityTasks(client *asynq.Client) {
	// Critical priority - password reset emails
	criticalPayload := tasks.EmailDeliveryPayload{
		UserID:  12345,
		To:      "user@example.com",
		Subject: "Password Reset Request",
		Body:    "Click here to reset your password...",
	}

	criticalTask, _ := tasks.NewEmailDeliveryTask(criticalPayload)
	info, err := client.Enqueue(criticalTask, asynq.Queue("critical"))
	if err != nil {
		log.Fatalf("Failed to enqueue critical task: %v", err)
	}
	log.Printf("Enqueued critical priority task: id=%s, queue=%s", info.ID, info.Queue)

	// Default priority - regular notifications
	defaultPayload := tasks.EmailDeliveryPayload{
		UserID:  12345,
		To:      "user@example.com",
		Subject: "New follower!",
		Body:    "Someone just followed you...",
	}

	defaultTask, _ := tasks.NewEmailDeliveryTask(defaultPayload)
	info, err = client.Enqueue(defaultTask, asynq.Queue("default"))
	if err != nil {
		log.Fatalf("Failed to enqueue default task: %v", err)
	}
	log.Printf("Enqueued default priority task: id=%s, queue=%s", info.ID, info.Queue)

	// Low priority - marketing emails
	lowPayload := tasks.EmailDeliveryPayload{
		UserID:  12345,
		To:      "user@example.com",
		Subject: "Weekly digest",
		Body:    "Here is what you missed this week...",
	}

	lowTask, _ := tasks.NewEmailDeliveryTask(lowPayload)
	info, err = client.Enqueue(lowTask, asynq.Queue("low"))
	if err != nil {
		log.Fatalf("Failed to enqueue low priority task: %v", err)
	}
	log.Printf("Enqueued low priority task: id=%s, queue=%s", info.ID, info.Queue)
}

// enqueueUniqueTask demonstrates preventing duplicate tasks.
func enqueueUniqueTask(client *asynq.Client) {
	payload := tasks.ReportGenerationPayload{
		ReportID:   "report_daily_2024_01_15",
		ReportType: "daily_summary",
		UserID:     12345,
		Format:     "pdf",
		StartDate:  time.Now().AddDate(0, 0, -1),
		EndDate:    time.Now(),
	}

	task, _ := tasks.NewReportGenerationTask(payload)

	// Use Unique option to prevent duplicate tasks
	// If a task with the same type and payload is already in the queue,
	// this will return an error instead of creating a duplicate
	info, err := client.Enqueue(task,
		// Task is unique for 1 hour - no duplicates within this window
		asynq.Unique(1*time.Hour),

		// Custom task ID for easier tracking
		asynq.TaskID(fmt.Sprintf("report:%s", payload.ReportID)),
	)

	if err != nil {
		if err == asynq.ErrDuplicateTask {
			log.Printf("Task already exists, skipping duplicate")
			return
		}
		log.Fatalf("Failed to enqueue unique task: %v", err)
	}

	log.Printf("Enqueued unique task: id=%s", info.ID)
}

// enqueueTaskWithDeadline demonstrates task deadline configuration.
func enqueueTaskWithDeadline(client *asynq.Client) {
	payload := tasks.ImageResizePayload{
		ImageID:      "img_456",
		SourceURL:    "https://storage.example.com/uploads/image.jpg",
		TargetWidth:  800,
		TargetHeight: 600,
		Quality:      85,
		Format:       "webp",
	}

	task, _ := tasks.NewImageResizeTask(payload)

	// Deadline sets an absolute time by which the task must complete
	// If the task is still running after this time, it will be cancelled
	deadline := time.Now().Add(5 * time.Minute)

	info, err := client.Enqueue(task,
		asynq.Deadline(deadline),
		asynq.Queue("default"),
	)
	if err != nil {
		log.Fatalf("Failed to enqueue task with deadline: %v", err)
	}

	log.Printf("Enqueued task with deadline: id=%s, deadline=%v", info.ID, deadline)
}
```

## Dead Letter Queue Handling

When tasks fail after exhausting all retries, they move to the archive (dead letter queue). Let us implement proper handling for these failed tasks.

```go
// internal/tasks/dlq_handler.go
package tasks

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/hibiken/asynq"
)

// DeadLetterQueueProcessor handles tasks that have failed all retries.
// It provides mechanisms for monitoring, alerting, and reprocessing.
type DeadLetterQueueProcessor struct {
	inspector *asynq.Inspector
	client    *asynq.Client
}

// NewDeadLetterQueueProcessor creates a new DLQ processor.
func NewDeadLetterQueueProcessor(redisOpt asynq.RedisClientOpt) *DeadLetterQueueProcessor {
	return &DeadLetterQueueProcessor{
		inspector: asynq.NewInspector(redisOpt),
		client:    asynq.NewClient(redisOpt),
	}
}

// Close releases resources.
func (p *DeadLetterQueueProcessor) Close() error {
	return p.client.Close()
}

// ListArchivedTasks retrieves tasks from the dead letter queue.
func (p *DeadLetterQueueProcessor) ListArchivedTasks(queueName string, limit int) ([]*asynq.TaskInfo, error) {
	tasks, err := p.inspector.ListArchivedTasks(queueName, asynq.PageSize(limit))
	if err != nil {
		return nil, fmt.Errorf("failed to list archived tasks: %w", err)
	}
	return tasks, nil
}

// RetryArchivedTask moves a task from the archive back to the pending queue.
func (p *DeadLetterQueueProcessor) RetryArchivedTask(queueName, taskID string) error {
	err := p.inspector.RunTask(queueName, taskID)
	if err != nil {
		return fmt.Errorf("failed to retry archived task: %w", err)
	}
	log.Printf("Retried archived task: queue=%s, id=%s", queueName, taskID)
	return nil
}

// RetryAllArchivedTasks retries all tasks in the dead letter queue.
func (p *DeadLetterQueueProcessor) RetryAllArchivedTasks(queueName string) (int, error) {
	count, err := p.inspector.RunAllArchivedTasks(queueName)
	if err != nil {
		return 0, fmt.Errorf("failed to retry all archived tasks: %w", err)
	}
	log.Printf("Retried %d archived tasks from queue %s", count, queueName)
	return count, nil
}

// DeleteArchivedTask permanently removes a task from the archive.
func (p *DeadLetterQueueProcessor) DeleteArchivedTask(queueName, taskID string) error {
	err := p.inspector.DeleteTask(queueName, taskID)
	if err != nil {
		return fmt.Errorf("failed to delete archived task: %w", err)
	}
	log.Printf("Deleted archived task: queue=%s, id=%s", queueName, taskID)
	return nil
}

// DeleteAllArchivedTasks clears the entire dead letter queue.
func (p *DeadLetterQueueProcessor) DeleteAllArchivedTasks(queueName string) (int, error) {
	count, err := p.inspector.DeleteAllArchivedTasks(queueName)
	if err != nil {
		return 0, fmt.Errorf("failed to delete all archived tasks: %w", err)
	}
	log.Printf("Deleted %d archived tasks from queue %s", count, queueName)
	return count, nil
}

// ArchiveStats holds statistics about the dead letter queue.
type ArchiveStats struct {
	QueueName      string
	ArchivedCount  int
	OldestTaskTime time.Time
	TasksByType    map[string]int
}

// GetArchiveStats retrieves statistics about archived tasks.
func (p *DeadLetterQueueProcessor) GetArchiveStats(queueName string) (*ArchiveStats, error) {
	info, err := p.inspector.GetQueueInfo(queueName)
	if err != nil {
		return nil, fmt.Errorf("failed to get queue info: %w", err)
	}

	stats := &ArchiveStats{
		QueueName:     queueName,
		ArchivedCount: info.Archived,
		TasksByType:   make(map[string]int),
	}

	// Get archived tasks to analyze by type
	tasks, err := p.inspector.ListArchivedTasks(queueName, asynq.PageSize(100))
	if err != nil {
		return stats, nil // Return partial stats
	}

	for _, task := range tasks {
		stats.TasksByType[task.Type]++
		if stats.OldestTaskTime.IsZero() || task.LastFailedAt.Before(stats.OldestTaskTime) {
			stats.OldestTaskTime = task.LastFailedAt
		}
	}

	return stats, nil
}

// MonitorDeadLetterQueue periodically checks the DLQ and alerts if thresholds are exceeded.
func (p *DeadLetterQueueProcessor) MonitorDeadLetterQueue(ctx context.Context, queueName string, threshold int) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			stats, err := p.GetArchiveStats(queueName)
			if err != nil {
				log.Printf("Failed to get archive stats: %v", err)
				continue
			}

			if stats.ArchivedCount > threshold {
				log.Printf("ALERT: Dead letter queue %s has %d tasks (threshold: %d)",
					queueName, stats.ArchivedCount, threshold)

				// Send alert (integrate with your monitoring system)
				p.sendAlert(stats)
			}
		}
	}
}

// sendAlert sends an alert about DLQ status (implement based on your alerting system).
func (p *DeadLetterQueueProcessor) sendAlert(stats *ArchiveStats) {
	// Example: Send to Slack, PagerDuty, OneUptime, etc.
	alertData, _ := json.MarshalIndent(stats, "", "  ")
	log.Printf("DLQ Alert:\n%s", alertData)
}
```

## Using the Inspector API

The Inspector API provides powerful capabilities for monitoring and managing your task queues.

```go
// cmd/inspector/main.go
package main

import (
	"fmt"
	"log"

	"github.com/hibiken/asynq"
	"github.com/yourusername/go-job-queue/internal/config"
)

func main() {
	inspector := asynq.NewInspector(config.GetRedisClientOpt())

	// Get all queue information
	queues, err := inspector.Queues()
	if err != nil {
		log.Fatalf("Failed to get queues: %v", err)
	}

	fmt.Println("=== Queue Status ===")
	for _, queueName := range queues {
		info, err := inspector.GetQueueInfo(queueName)
		if err != nil {
			log.Printf("Failed to get info for queue %s: %v", queueName, err)
			continue
		}

		fmt.Printf("\nQueue: %s\n", queueName)
		fmt.Printf("  Active:    %d\n", info.Active)
		fmt.Printf("  Pending:   %d\n", info.Pending)
		fmt.Printf("  Scheduled: %d\n", info.Scheduled)
		fmt.Printf("  Retry:     %d\n", info.Retry)
		fmt.Printf("  Archived:  %d\n", info.Archived)
		fmt.Printf("  Completed: %d\n", info.Completed)
		fmt.Printf("  Processed: %d\n", info.Processed)
		fmt.Printf("  Failed:    %d\n", info.Failed)
	}

	// List pending tasks in a specific queue
	fmt.Println("\n=== Pending Tasks (default queue) ===")
	pendingTasks, err := inspector.ListPendingTasks("default", asynq.PageSize(10))
	if err != nil {
		log.Printf("Failed to list pending tasks: %v", err)
	} else {
		for _, task := range pendingTasks {
			fmt.Printf("  - ID: %s, Type: %s\n", task.ID, task.Type)
		}
	}

	// List scheduled tasks
	fmt.Println("\n=== Scheduled Tasks ===")
	scheduledTasks, err := inspector.ListScheduledTasks("default", asynq.PageSize(10))
	if err != nil {
		log.Printf("Failed to list scheduled tasks: %v", err)
	} else {
		for _, task := range scheduledTasks {
			fmt.Printf("  - ID: %s, Type: %s, ProcessAt: %v\n",
				task.ID, task.Type, task.NextProcessAt)
		}
	}

	// List retry tasks
	fmt.Println("\n=== Retry Tasks ===")
	retryTasks, err := inspector.ListRetryTasks("default", asynq.PageSize(10))
	if err != nil {
		log.Printf("Failed to list retry tasks: %v", err)
	} else {
		for _, task := range retryTasks {
			fmt.Printf("  - ID: %s, Type: %s, Retried: %d, Error: %s\n",
				task.ID, task.Type, task.Retried, task.LastErr)
		}
	}

	// Pause and unpause queues (useful for maintenance)
	// inspector.PauseQueue("low")
	// inspector.UnpauseQueue("low")
}
```

## Setting Up the Asynq Web UI

Asynq provides a web-based monitoring UI that makes it easy to visualize and manage your queues.

```go
// cmd/webui/main.go
package main

import (
	"log"
	"net/http"

	"github.com/hibiken/asynq"
	"github.com/hibiken/asynqmon"
	"github.com/yourusername/go-job-queue/internal/config"
)

func main() {
	// Create the Asynqmon handler
	h := asynqmon.New(asynqmon.Options{
		RootPath:          "/monitoring",
		RedisConnOpt:      config.GetRedisClientOpt(),
		PayloadFormatter:  asynqmon.PayloadFormatterFunc(formatPayload),
		ResultFormatter:   asynqmon.ResultFormatterFunc(formatResult),
	})

	// Create a new HTTP server mux
	mux := http.NewServeMux()
	mux.Handle("/monitoring/", h)

	// Add a health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	log.Println("Starting Asynqmon web UI on :8080/monitoring")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// formatPayload customizes how task payloads are displayed in the UI.
func formatPayload(taskType string, payload []byte) string {
	return string(payload)
}

// formatResult customizes how task results are displayed in the UI.
func formatResult(taskType string, result []byte) string {
	return string(result)
}
```

## Periodic/Recurring Tasks

Asynq also supports cron-like scheduled tasks using the Scheduler.

```go
// cmd/scheduler/main.go
package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/hibiken/asynq"
	"github.com/yourusername/go-job-queue/internal/config"
	"github.com/yourusername/go-job-queue/internal/tasks"
)

func main() {
	// Create a new scheduler
	scheduler := asynq.NewScheduler(
		config.GetRedisClientOpt(),
		&asynq.SchedulerOpts{
			Location: time.UTC,
			Logger:   NewAsynqLogger(),
		},
	)

	// Register periodic tasks

	// Daily report at 6 AM UTC
	dailyReportPayload := tasks.ReportGenerationPayload{
		ReportType: "daily_summary",
		Format:     "pdf",
	}
	dailyReportTask, _ := tasks.NewReportGenerationTask(dailyReportPayload)
	scheduler.Register("0 6 * * *", dailyReportTask, asynq.Queue("low"))

	// Hourly data sync
	dataSyncTask := asynq.NewTask(tasks.TypeDataSync, nil)
	scheduler.Register("0 * * * *", dataSyncTask, asynq.Queue("default"))

	// Every 5 minutes health check
	healthCheckTask := asynq.NewTask("health:check", nil)
	scheduler.Register("*/5 * * * *", healthCheckTask, asynq.Queue("critical"))

	// Handle graceful shutdown
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGTERM, syscall.SIGINT)
		<-sigCh
		scheduler.Shutdown()
	}()

	log.Println("Starting Asynq scheduler...")
	if err := scheduler.Run(); err != nil {
		log.Fatalf("Failed to run scheduler: %v", err)
	}
}
```

## Best Practices

Here are some best practices to follow when building job queues with Asynq:

### 1. Idempotent Task Handlers

Always design your task handlers to be idempotent, meaning running them multiple times produces the same result:

```go
// Good: Check if email was already sent before sending
func (h *EmailHandler) ProcessTask(ctx context.Context, t *asynq.Task) error {
    var payload EmailDeliveryPayload
    json.Unmarshal(t.Payload(), &payload)

    // Check if already sent (idempotency check)
    if h.emailRepo.WasSent(payload.EmailID) {
        log.Printf("Email %s already sent, skipping", payload.EmailID)
        return nil
    }

    // Send email and mark as sent atomically
    return h.emailRepo.SendAndMark(payload)
}
```

### 2. Proper Error Classification

Distinguish between retryable and non-retryable errors:

```go
func processTask(ctx context.Context, t *asynq.Task) error {
    // Non-retryable: invalid payload
    if err := validatePayload(t.Payload()); err != nil {
        return fmt.Errorf("%w: %v", asynq.SkipRetry, err)
    }

    // Retryable: temporary network error
    if err := callExternalAPI(); err != nil {
        return err // Will be retried
    }

    return nil
}
```

### 3. Context Cancellation

Always respect context cancellation for graceful shutdown:

```go
func processLongTask(ctx context.Context, t *asynq.Task) error {
    for i := 0; i < 100; i++ {
        select {
        case <-ctx.Done():
            return ctx.Err() // Task will be re-queued
        default:
            doWork(i)
        }
    }
    return nil
}
```

### 4. Structured Logging

Use structured logging for better observability:

```go
log.Printf("task_type=%s task_id=%s user_id=%d status=completed duration=%v",
    task.Type(), task.ResultWriter().TaskID(), payload.UserID, duration)
```

## Conclusion

Asynq provides a robust, feature-rich solution for building job queues in Go. With Redis as its backbone, you get reliable message persistence, horizontal scaling, and battle-tested performance.

Key takeaways from this guide:

- **Task organization**: Define clear task types and payload structures for maintainability
- **Priority queues**: Use weighted priorities to ensure critical tasks are processed first
- **Retry policies**: Implement exponential backoff with proper error classification
- **Dead letter handling**: Monitor and manage failed tasks proactively
- **Observability**: Use the Inspector API and web UI for monitoring
- **Periodic tasks**: Schedule recurring jobs with the Scheduler

For production deployments, consider:

- Setting up Redis Sentinel or Cluster for high availability
- Integrating with your observability stack (Prometheus, OpenTelemetry)
- Implementing proper alerting for dead letter queue growth
- Using the Asynq web UI for operational visibility

The complete source code for this tutorial is available on GitHub, and you can integrate these patterns into your existing Go applications to build reliable, scalable background job processing systems.

## Related Resources

- [Asynq GitHub Repository](https://github.com/hibiken/asynq)
- [Asynq Documentation](https://github.com/hibiken/asynq/wiki)
- [Redis Best Practices](https://redis.io/docs/management/optimization/)
- [Go Concurrency Patterns](https://go.dev/blog/pipelines)
