# Validation Summary: How to Use LOLWUT in Redis (Easter Egg and Version Check)

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (LOLWUT command)
- Bash scripting (health check scripts)
- redis-cli

## Sources Consulted
- [Redis LOLWUT official documentation](https://redis.io/docs/latest/commands/lolwut/)
- [antirez blog: LOLWUT: a piece of art inside a database command (antirez.com/news/123)](http://antirez.com/news/123)
- [Redis source code: lolwut.c, lolwut5.c, lolwut6.c](https://github.com/redis/redis/blob/unstable/src/lolwut.c)
- [GitHub Issue #12074: LOLWUT ASCII art unimplemented in Redis 7](https://github.com/redis/redis/issues/12074)
- [GitHub PR #14048: LOLWUT for Redis 8 by antirez](https://github.com/redis/redis/pull/14048)

## Issues Found

1. **Artwork table was almost entirely incorrect.** The original table claimed: Redis 5.0 = "Dragon curve fractal", 6.0 = "Mandelbrot set", 6.2 = "3D hilbert curve", 7.0 = "Spinning shapes", 7.2 = "Various geometric patterns". The actual artwork is: Redis 5.x = Schotter by Georg Nees (grid of squares with increasing randomness), Redis 6.x = City skyline inspired by 8-bit game backgrounds (Plaguemon), Redis 7.x = no dedicated artwork (only prints version string, a known gap per GitHub issue #12074), Redis 8.x = computer-generated poetry (Balestrini's TAPE MARK I algorithm). Also consolidated minor versions (6.0/6.2) since they share the same artwork, and added Redis 8.x.

2. **Example output showed ASCII art for Redis 7.x, which has no artwork.** Changed the example to show Redis 6.x output instead, and added a note that Redis 7.x only prints the version string.

3. **`LOLWUT | tail -1` is unreliable for version extraction.** The LOLWUT output may include trailing blank lines depending on redis-cli's output mode, making `tail -1` return an empty line. Changed to `grep "Redis ver\."` which reliably extracts the version line regardless of trailing whitespace.

4. **Health check script used `tail -1` piped to grep.** Simplified to just `grep -oE` directly on LOLWUT output, which is more robust.

5. **`LOLWUT 10` explanation was misleading.** The original text vaguely said "some versions accept a numeric argument." Clarified that numeric arguments without the VERSION keyword are passed as parameters to the current version's artwork generator (controlling scale/complexity), and should not be confused with the VERSION subcommand.

6. **Claim that "each Redis release ships with new artwork" was inaccurate.** Redis 7.x shipped without new artwork. Changed to "major Redis releases may ship with new artwork."

## Review Notes
- The version line format varies by LOLWUT version. Redis 5.x includes "Georg Nees - schotter, plotter on paper, 1968. Redis ver. X.X.X" while Redis 6.x includes "Original 8 bit image from Plaguemon by hikikomori. Redis ver. X.X.X". The common suffix is always "Redis ver. X.X.X".
- Redis 8.x introduced a text-based (poetry) LOLWUT rather than visual ASCII art, which is a departure from prior versions.
- The `LOLWUT VERSION <n>` subcommand works on any Redis version that supports LOLWUT, allowing users to view artwork from other versions even when running a version without its own artwork (like 7.x).
