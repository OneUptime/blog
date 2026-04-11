# Validation Summary: History of Redis: From Side Project to Industry Standard

## Status
not-code-blog

## Post Type
Historical narrative / Timeline article

## Technologies Covered
- Redis (in-memory data store)
- Valkey (Redis fork)
- Redis Sentinel (high availability)
- Redis Cluster (horizontal scaling)
- Redis modules (RediSearch, RedisJSON, RedisTimeSeries)
- RESP protocol

## Sources Consulted
- Redis Sentinel official documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis 3.0.0 release announcement (Redis Cluster GA): https://groups.google.com/g/redis-db/c/dO0bFyD_THQ
- Redis 4.0.0 release announcement (modules system): https://redis.io/blog/redis-4-0-0-released/
- Redis license change announcement (March 2024): https://redis.io/blog/redis-adopts-dual-source-available-licensing/
- Redis 7.4.0 GitHub release (July 29, 2024): https://github.com/redis/redis/releases/tag/7.4.0
- Antirez blog post "The end of the Redis adventure" (June 2020): https://antirez.com/news/133
- Wikipedia — Salvatore Sanfilippo: https://en.wikipedia.org/wiki/Salvatore_Sanfilippo
- Wikipedia — Redis (company): https://en.wikipedia.org/wiki/Redis_(company)
- TechCrunch — Garantia Data renamed to Redis Labs (2014): https://techcrunch.com/2014/01/29/database-provider-garantia-data-makes-another-name-change-this-time-to-redis-labs/

## Issues Found

Although this is a non-code history piece, six significant factual errors were found and corrected:

1. **Redis Sentinel date wrong by 2+ years**: The post claimed Sentinel was introduced in 2010. Sentinel v1 actually shipped with Redis 2.6 in October 2012; the stable v2 shipped with Redis 2.8 in November 2013. Fixed timeline to show 2012 (Redis 2.6) and 2013 (Redis 2.8 stable).

2. **Redis Cluster date misleading**: The post listed "2012 - Redis Cluster (horizontal scaling)" but Cluster was not released until Redis 3.0 GA in April 2015. The 2012 entry was removed and the Cluster reference was consolidated into the existing 2015 entry.

3. **Redis modules system date wrong by 2 years**: The post claimed modules were introduced in 2015. The modules API was actually introduced in Redis 4.0, released July 2017. Fixed to "2017 - Redis modules system introduced (Redis 4.0)".

4. **Fabricated antirez quote**: The post attributed the quote "I'm 40 years old, I have different interests now, and Redis is in good hands" to Sanfilippo. This quote does not appear in his actual blog post "The end of the Redis adventure" (June 2020). Additionally, he was 43 at the time (born March 7, 1977), not 40. Replaced with an accurate quote from his actual blog post about wanting to be a creative coder rather than a maintainer.

5. **Redis Labs founding name incorrect**: The post said "Redis Labs was founded in 2011." The company was actually founded as Garantia Data in 2011 and renamed to Redis Labs in 2014. Fixed to reflect the correct founding name and rename date.

6. **Redis 7.4 release date wrong**: The post said "March 2024 - Redis 7.4 released under SSPL/RSALv2." The license change was announced in March 2024, but Redis 7.4.0 was not released until July 29, 2024. Fixed by separating the license announcement (March 2024) from the 7.4 release (July 2024).

## Review Notes
- This is a historical narrative with no executable code, commands, or configuration snippets — classified as "not-code-blog." Factual errors were still corrected due to their severity (especially the fabricated quote).
- The claim "ranking in the top 5 most loved databases consistently from 2017 onward" in Stack Overflow surveys is approximately correct — Redis has ranked very highly, including #1 most loved database in some years.
- The first public release date of "April 10, 2009" could not be precisely verified; the first Git commit was March 22, 2009, with public announcements in the April timeframe. Left as-is since it's in the right range.
- Starting with Redis 8.0, AGPLv3 was added as a third license option alongside SSPL and RSALv2. The post does not mention this, but it is beyond the scope of the article's narrative.
