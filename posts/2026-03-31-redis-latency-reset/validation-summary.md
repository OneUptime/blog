# Validation Summary: How to Use LATENCY RESET in Redis to Clear Latency Data

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (LATENCY RESET command, latency monitoring subsystem)
- Redis CLI (`redis-cli`)
- Bash scripting (automated reset loop)

## Sources Consulted
- Redis official documentation: LATENCY RESET command (https://redis.io/docs/latest/commands/latency-reset/)
- Redis official documentation: LATENCY LATEST command (https://redis.io/docs/latest/commands/latency-latest/)
- Redis official documentation: LATENCY HISTORY command (https://redis.io/docs/latest/commands/latency-history/)
- Redis latency monitoring framework documentation (https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency-monitor/)

## Issues Found
- **Incorrect circular buffer size**: The Mermaid flowchart in the "What Gets Reset" section stated the circular buffer holds "up to 180 samples" per event. The official Redis documentation specifies 160 elements per time series. Changed 180 to 160.

## Review Notes
- The command syntax in the blog uses `[event-name [event-name ...]]` while official docs use `[event [event ...]]`. This is a cosmetic difference that improves readability and is not technically incorrect.
- LATENCY RESET has been available since Redis 2.8.13. The post does not mention a minimum version, which is fine since 2.8.13 is very old at this point.
- The official docs note that LATENCY RESET is not compatible with Redis Software (Standard or Active-Active) or Redis Cloud (Standard or Active-Active). The blog does not mention this limitation, which could be relevant for cloud users.
- The blog correctly covers both aspects of what gets reset: the circular buffer of samples and the all-time maximum event time register.
- All code examples, CLI commands, and configuration snippets are correct and would work as described.
