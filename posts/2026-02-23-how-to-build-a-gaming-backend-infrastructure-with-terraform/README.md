# How to Build a Gaming Backend Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure Patterns, Gaming, GameLift, Real-Time, Matchmaking

Description: A hands-on guide to building gaming backend infrastructure with Terraform including matchmaking, session management, leaderboards, player data, and auto-scaling game servers.

---

Building a gaming backend is not like building a typical web application. You need low-latency connections, real-time state synchronization, matchmaking systems, and the ability to scale game servers up and down as player counts fluctuate throughout the day. Terraform lets you codify this entire stack so you can iterate quickly and deploy consistently.

## Why Terraform for Gaming Infrastructure?

Gaming backends have a lot of interconnected pieces. Game servers, matchmaking queues, player databases, leaderboards, analytics pipelines. Setting these up manually means you cannot easily spin up test environments or replicate the setup in new regions. Terraform makes your entire gaming backend reproducible, version-controlled, and deployable to multiple regions with variable changes.

## Architecture Overview

Our gaming backend includes:

- Amazon GameLift for game server management
- DynamoDB for player profiles and leaderboards
- ElastiCache Redis for real-time state and sessions
- API Gateway and Lambda for REST APIs
- Cognito for player authentication
- SQS for asynchronous processing
- CloudWatch for monitoring

## Player Authentication

Start with Cognito for player sign-up and login.

```hcl
# Cognito User Pool for players
resource "aws_cognito_user_pool" "players" {
  name = "game-players"

  # Allow email or username login
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = false
  }

  schema {
    name                = "display_name"
    attribute_data_type = "String"
    mutable             = true
    required            = false

    string_attribute_constraints {
      min_length = 3
      max_length = 20
    }
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_cognito_user_pool_client" "game_client" {
  name         = "game-client"
  user_pool_id = aws_cognito_user_pool.players.id

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_CUSTOM_AUTH",
  ]

  access_token_validity  = 1
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "hours"
    refresh_token = "days"
  }
}

# Identity pool for AWS resource access from game clients
resource "aws_cognito_identity_pool" "game" {
  identity_pool_name               = "game_identity_pool"
  allow_unauthenticated_identities = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.game_client.id
    provider_name           = aws_cognito_user_pool.players.endpoint
    server_side_token_check = true
  }
}
```

## Player Data Store

DynamoDB handles player profiles, inventory, and game progress.

```hcl
# Player profiles table
resource "aws_dynamodb_table" "player_profiles" {
  name         = "player-profiles"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "playerId"

  attribute {
    name = "playerId"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Environment = var.environment
  }
}

# Leaderboard table - designed for efficient ranking queries
resource "aws_dynamodb_table" "leaderboard" {
  name         = "leaderboard"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "leaderboardId"
  range_key    = "score"

  attribute {
    name = "leaderboardId"
    type = "S"
  }

  attribute {
    name = "score"
    type = "N"
  }

  attribute {
    name = "playerId"
    type = "S"
  }

  global_secondary_index {
    name            = "playerId-index"
    hash_key        = "playerId"
    range_key       = "score"
    projection_type = "ALL"
  }

  tags = {
    Environment = var.environment
  }
}

# Match history table
resource "aws_dynamodb_table" "match_history" {
  name         = "match-history"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "matchId"

  attribute {
    name = "matchId"
    type = "S"
  }

  attribute {
    name = "playerId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  global_secondary_index {
    name            = "player-matches-index"
    hash_key        = "playerId"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }
}
```

## ElastiCache Redis for Real-Time State

Redis handles session data, matchmaking queues, and real-time game state.

```hcl
# Redis subnet group
resource "aws_elasticache_subnet_group" "game" {
  name       = "game-redis-subnet"
  subnet_ids = var.private_subnet_ids
}

# Redis security group
resource "aws_security_group" "redis" {
  name        = "game-redis-sg"
  description = "Security group for game Redis cluster"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.game_servers.id, aws_security_group.lambda.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Redis cluster for game state and matchmaking
resource "aws_elasticache_replication_group" "game" {
  replication_group_id = "game-state"
  description          = "Redis cluster for game state management"

  node_type            = "cache.r6g.large"
  num_cache_clusters   = 3
  engine_version       = "7.0"
  parameter_group_name = "default.redis7"
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.game.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  automatic_failover_enabled = true

  snapshot_retention_limit = 7
  snapshot_window          = "03:00-05:00"
  maintenance_window       = "mon:05:00-mon:07:00"

  tags = {
    Environment = var.environment
    Purpose     = "game-state"
  }
}
```

## Game Server Fleet with GameLift

GameLift manages your game server instances with auto-scaling based on player demand.

```hcl
# GameLift build - your compiled game server
resource "aws_gamelift_build" "game_server" {
  name             = "game-server-${var.build_version}"
  operating_system = "AMAZON_LINUX_2"

  storage_location {
    bucket   = aws_s3_bucket.game_builds.id
    key      = "builds/${var.build_version}/game-server.zip"
    role_arn = aws_iam_role.gamelift_build.arn
  }

  tags = {
    Version     = var.build_version
    Environment = var.environment
  }
}

# GameLift fleet
resource "aws_gamelift_fleet" "main" {
  build_id    = aws_gamelift_build.game_server.id
  name        = "game-server-fleet"
  description = "Main game server fleet"

  ec2_instance_type = "c5.large"
  fleet_type        = "ON_DEMAND"

  runtime_configuration {
    game_session_activation_timeout_seconds = 300
    max_concurrent_game_session_activations = 5

    server_process {
      concurrent_executions = 10
      launch_path           = "/local/game/server"
      parameters            = "-port 7777 -log"
    }
  }

  ec2_inbound_permission {
    from_port = 7777
    to_port   = 7877
    ip_range  = "0.0.0.0/0"
    protocol  = "UDP"
  }

  ec2_inbound_permission {
    from_port = 7777
    to_port   = 7877
    ip_range  = "0.0.0.0/0"
    protocol  = "TCP"
  }

  resource_creation_limit_policy {
    new_game_sessions_per_creator = 5
    policy_period_in_minutes      = 15
  }

  tags = {
    Environment = var.environment
  }
}

# Auto-scaling for game fleet
resource "aws_gamelift_fleet" "scaling_target" {
  # Scaling is configured through GameLift API
  # This is typically done via aws_appautoscaling_target
}

resource "aws_appautoscaling_target" "gamelift" {
  service_namespace  = "gamelift"
  resource_id        = "fleet/${aws_gamelift_fleet.main.id}"
  scalable_dimension = "gamelift:fleet:DesiredEC2Instances"
  min_capacity       = 2
  max_capacity       = 50
}

resource "aws_appautoscaling_policy" "gamelift" {
  name               = "game-fleet-scaling"
  policy_type        = "TargetTrackingScaling"
  service_namespace  = aws_appautoscaling_target.gamelift.service_namespace
  resource_id        = aws_appautoscaling_target.gamelift.resource_id
  scalable_dimension = aws_appautoscaling_target.gamelift.scalable_dimension

  target_tracking_scaling_policy_configuration {
    target_value = 70  # Target 70% available game sessions

    predefined_metric_specification {
      predefined_metric_type = "PercentAvailableGameSessions"
    }

    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Matchmaking configuration
resource "aws_gamelift_matchmaking_configuration" "ranked" {
  name                    = "ranked-match"
  game_session_queue_arns = [aws_gamelift_game_session_queue.main.arn]
  rule_set_name           = aws_gamelift_matchmaking_rule_set.ranked.name

  acceptance_required        = true
  acceptance_timeout_seconds = 30
  request_timeout_seconds    = 60
  backfill_mode              = "AUTOMATIC"

  additional_player_count = 0

  game_property {
    key   = "gameMode"
    value = "ranked"
  }
}

resource "aws_gamelift_matchmaking_rule_set" "ranked" {
  name = "ranked-rules"

  rule_set_body = jsonencode({
    name               = "ranked-matchmaking"
    ruleLanguageVersion = "1.0"
    playerAttributes = [{
      name    = "skill"
      type    = "number"
      default = 1000
    }]
    teams = [{
      name       = "players"
      minPlayers = 2
      maxPlayers = 10
    }]
    rules = [{
      name        = "skill-range"
      type        = "distance"
      measurements = ["teams[players].players.attributes[skill]"]
      referenceValue = "avg(teams[players].players.attributes[skill])"
      maxDistance  = 200
    }]
    expansions = [{
      target = "rules[skill-range].maxDistance"
      steps = [
        { waitTimeSeconds = 10, value = 300 },
        { waitTimeSeconds = 20, value = 500 },
      ]
    }]
  })
}
```

## Game API Gateway

REST API for non-real-time operations like profile management and leaderboards.

```hcl
# API Gateway for game services
resource "aws_apigatewayv2_api" "game" {
  name          = "game-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT"]
    allow_headers = ["Content-Type", "Authorization"]
  }
}

resource "aws_apigatewayv2_stage" "game" {
  api_id      = aws_apigatewayv2_api.game.id
  name        = "$default"
  auto_deploy = true
}

# Leaderboard Lambda
resource "aws_lambda_function" "leaderboard" {
  filename         = "leaderboard.zip"
  function_name    = "game-leaderboard"
  role             = aws_iam_role.game_lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10

  environment {
    variables = {
      LEADERBOARD_TABLE = aws_dynamodb_table.leaderboard.name
      REDIS_ENDPOINT    = aws_elasticache_replication_group.game.primary_endpoint_address
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }
}
```

## Monitoring

Track player counts, match wait times, and server health.

```hcl
# CloudWatch dashboard for game metrics
resource "aws_cloudwatch_dashboard" "game" {
  dashboard_name = "gaming-overview"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "Active Game Sessions"
          metrics = [
            ["AWS/GameLift", "ActiveGameSessions", "FleetId", aws_gamelift_fleet.main.id]
          ]
          period = 60
          stat   = "Average"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "Active Players"
          metrics = [
            ["AWS/GameLift", "CurrentPlayerSessions", "FleetId", aws_gamelift_fleet.main.id]
          ]
          period = 60
          stat   = "Sum"
        }
      }
    ]
  })
}

# Alert when matchmaking wait time is too high
resource "aws_cloudwatch_metric_alarm" "match_wait" {
  alarm_name          = "high-matchmaking-wait"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "MatchAcceptanceTime"
  namespace           = "AWS/GameLift"
  period              = 300
  statistic           = "Average"
  threshold           = 60  # 60 seconds
  alarm_actions       = [aws_sns_topic.game_alerts.arn]
}
```

## Wrapping Up

Gaming backend infrastructure demands low latency, real-time communication, and the ability to scale dynamically with player demand. Terraform lets you define all of this in code - from GameLift fleets and matchmaking rules to Redis clusters and DynamoDB tables.

The biggest wins come from auto-scaling your game server fleet based on available session capacity and using Redis for anything that needs sub-millisecond access times. DynamoDB handles the durable data, while Redis handles the ephemeral, real-time stuff.

For monitoring your game infrastructure health, tracking player metrics, and alerting on matchmaking issues, check out [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-gaming-backend-infrastructure-with-terraform/view) for real-time gaming infrastructure observability.
