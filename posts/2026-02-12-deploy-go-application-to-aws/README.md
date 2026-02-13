# How to Deploy a Go Application to AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Go, Golang, Deployment, ECS

Description: Practical guide to deploying Go applications on AWS using ECS Fargate, Lambda, and EC2 with container builds, CI/CD pipelines, and production configurations.

---

Go applications are a natural fit for AWS deployments. They compile to a single binary, have minimal runtime dependencies, start up in milliseconds, and use very little memory compared to JVM or interpreted languages. This means smaller containers, faster cold starts on Lambda, and lower infrastructure costs across the board.

Let's look at the best ways to get a Go app running on AWS.

## Preparing Your Go Application

Here's a minimal Go web server that we'll deploy. It includes a health check endpoint which every deployment method needs:

```go
// main.go
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "os"
    "time"
)

type HealthResponse struct {
    Status    string `json:"status"`
    Timestamp string `json:"timestamp"`
}

func main() {
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    mux := http.NewServeMux()

    mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]string{
            "message": "Hello from Go on AWS!",
        })
    })

    mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        resp := HealthResponse{
            Status:    "healthy",
            Timestamp: time.Now().UTC().Format(time.RFC3339),
        }
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(resp)
    })

    server := &http.Server{
        Addr:         ":" + port,
        Handler:      mux,
        ReadTimeout:  15 * time.Second,
        WriteTimeout: 15 * time.Second,
        IdleTimeout:  60 * time.Second,
    }

    log.Printf("Server starting on port %s", port)
    if err := server.ListenAndServe(); err != nil {
        log.Fatalf("Server failed: %v", err)
    }
}
```

## Option 1: ECS Fargate (Recommended)

ECS Fargate is the most common way to deploy Go services on AWS. You get container-based deployments without managing servers, and Go's tiny container images make this approach very cost-effective.

### Dockerfile

Go binaries are self-contained, so your final Docker image can be incredibly small. This multi-stage build produces an image under 15MB:

```dockerfile
# Dockerfile
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy go mod files first for better caching
COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Build a static binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -o /app/server .

# Use scratch for the smallest possible image
FROM scratch

# Copy CA certificates for HTTPS calls
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy the binary
COPY --from=builder /app/server /server

EXPOSE 8080

ENTRYPOINT ["/server"]
```

Using `scratch` as the base image means there's literally nothing in the container except your binary and CA certificates. No shell, no package manager, no attack surface.

### Build and Push to ECR

```bash
# Create ECR repository
aws ecr create-repository --repository-name go-app --region us-east-1

# Authenticate Docker
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build and push
docker build -t go-app .
docker tag go-app:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/go-app:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/go-app:latest
```

### ECS Task Definition

Go apps are lightweight, so you can get away with minimal CPU and memory. This allocates 256 CPU units (0.25 vCPU) and 512MB memory:

```json
{
  "family": "go-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "go-app",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/go-app:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "PORT", "value": "8080"},
        {"name": "ENV", "value": "production"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/go-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD", "/server", "-health-check"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

### Create the Service

```bash
# Create cluster
aws ecs create-cluster --cluster-name go-cluster

# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service \
  --cluster go-cluster \
  --service-name go-service \
  --task-definition go-app \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

## Option 2: AWS Lambda

Go's fast startup time makes it one of the best languages for Lambda. Cold starts are typically under 100ms.

Write a Lambda handler:

```go
// lambda/main.go
package main

import (
    "context"
    "encoding/json"

    "github.com/aws/aws-lambda-go/events"
    "github.com/aws/aws-lambda-go/lambda"
)

type Response struct {
    Message string `json:"message"`
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    resp := Response{Message: "Hello from Go Lambda!"}
    body, _ := json.Marshal(resp)

    return events.APIGatewayProxyResponse{
        StatusCode: 200,
        Headers:    map[string]string{"Content-Type": "application/json"},
        Body:       string(body),
    }, nil
}

func main() {
    lambda.Start(handler)
}
```

Build and deploy using the provided.al2023 runtime:

```bash
# Build for Lambda's Amazon Linux 2023
GOOS=linux GOARCH=amd64 go build -tags lambda.norpc -o bootstrap lambda/main.go

# Package it
zip function.zip bootstrap

# Create the Lambda function
aws lambda create-function \
  --function-name go-api \
  --runtime provided.al2023 \
  --handler bootstrap \
  --zip-file fileb://function.zip \
  --role arn:aws:iam::ACCOUNT_ID:role/lambda-execution-role \
  --memory-size 128 \
  --timeout 30
```

## Option 3: EC2 with Systemd

For long-running services where you need direct server access, deploying to EC2 with systemd gives you full control.

Create a systemd service file:

```ini
# /etc/systemd/system/go-app.service
[Unit]
Description=Go Application
After=network.target

[Service]
Type=simple
User=goapp
Group=goapp
WorkingDirectory=/opt/go-app
ExecStart=/opt/go-app/server
Restart=always
RestartSec=5
Environment=PORT=8080
Environment=ENV=production
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

Deploy with a user data script:

```bash
#!/bin/bash
# EC2 user data
yum update -y

# Create app user
useradd -r -s /bin/false goapp

# Download binary from S3
mkdir -p /opt/go-app
aws s3 cp s3://my-deploy-bucket/go-app/server /opt/go-app/server
chmod +x /opt/go-app/server
chown -R goapp:goapp /opt/go-app

# Install and start the systemd service
cp /opt/go-app/go-app.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable go-app
systemctl start go-app
```

## CI/CD Pipeline

Here's a GitHub Actions workflow for building and deploying to ECS:

```yaml
# .github/workflows/deploy.yml
name: Deploy Go App

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'

      - name: Run tests
        run: go test ./...

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to ECR
        id: ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push
        run: |
          docker build -t ${{ steps.ecr.outputs.registry }}/go-app:${{ github.sha }} .
          docker push ${{ steps.ecr.outputs.registry }}/go-app:${{ github.sha }}

      - name: Update ECS service
        run: |
          aws ecs update-service --cluster go-cluster --service go-service --force-new-deployment
```

## Structured Logging

Use structured logging for better CloudWatch integration:

```go
// logger/logger.go
package logger

import (
    "encoding/json"
    "log"
    "os"
    "time"
)

type LogEntry struct {
    Level     string `json:"level"`
    Message   string `json:"message"`
    Timestamp string `json:"timestamp"`
    RequestID string `json:"request_id,omitempty"`
}

var logger = log.New(os.Stdout, "", 0)

func Info(msg string, requestID string) {
    entry := LogEntry{
        Level:     "INFO",
        Message:   msg,
        Timestamp: time.Now().UTC().Format(time.RFC3339),
        RequestID: requestID,
    }
    data, _ := json.Marshal(entry)
    logger.Println(string(data))
}
```

## Monitoring

Go's built-in `expvar` package and libraries like Prometheus client work well for metrics collection on AWS. For end-to-end monitoring that covers uptime, response times, and alerting, see our guide on [AWS monitoring tools](https://oneuptime.com/blog/post/2026-02-13-aws-monitoring-tools-comparison/view).

## Summary

Go's compiled binaries, fast startup, and low memory footprint make it ideal for AWS deployment. ECS Fargate with scratch-based containers gives you the best balance of simplicity and control. Lambda is perfect for event-driven workloads with near-zero cold starts. Pick the approach that matches your team's workflow and your application's requirements, and you'll have a production-ready Go service in no time.
