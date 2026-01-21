# How to Build a Real-Time Bidding System with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Real-Time, Bidding, Auctions, E-Commerce, WebSockets, High Concurrency

Description: A comprehensive guide to building real-time bidding and auction systems with Redis, covering atomic bid processing, concurrent bid handling, live updates, and auction management.

---

Real-time bidding systems require handling concurrent bids, maintaining bid history, and pushing instant updates to all participants. Redis's atomic operations and pub/sub capabilities make it ideal for building responsive auction platforms. This guide covers how to implement a complete bidding system with proper concurrency handling.

## Bidding System Architecture

A real-time bidding system includes:

1. **Auction Management**: Create, start, and close auctions
2. **Bid Processing**: Handle bids atomically to prevent race conditions
3. **Live Updates**: Push bid updates to all viewers in real-time
4. **Bid History**: Track all bids for transparency
5. **Winner Determination**: Handle auction closing and winner selection

## Auction Data Model

```python
import redis
import json
import time
import uuid
from enum import Enum
from typing import Optional, Dict, List
from dataclasses import dataclass, asdict

class AuctionStatus(Enum):
    DRAFT = 'draft'
    SCHEDULED = 'scheduled'
    ACTIVE = 'active'
    ENDED = 'ended'
    CANCELLED = 'cancelled'

@dataclass
class Auction:
    id: str
    title: str
    description: str
    starting_price: float
    reserve_price: Optional[float]
    min_increment: float
    start_time: float
    end_time: float
    status: str
    seller_id: str
    current_price: float = 0
    current_winner: Optional[str] = None
    bid_count: int = 0
    created_at: float = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = time.time()
        if self.current_price == 0:
            self.current_price = self.starting_price

@dataclass
class Bid:
    id: str
    auction_id: str
    bidder_id: str
    amount: float
    timestamp: float
    is_auto_bid: bool = False
    max_auto_bid: Optional[float] = None
```

## Auction Service

```python
class AuctionService:
    """Manage auctions with Redis"""

    def __init__(self, redis_client):
        self.redis = redis_client

    def create_auction(self, auction: Auction) -> str:
        """Create a new auction"""
        auction_key = f"auction:{auction.id}"

        # Store auction data
        self.redis.hset(auction_key, mapping={
            'id': auction.id,
            'title': auction.title,
            'description': auction.description,
            'starting_price': auction.starting_price,
            'reserve_price': auction.reserve_price or '',
            'min_increment': auction.min_increment,
            'start_time': auction.start_time,
            'end_time': auction.end_time,
            'status': auction.status,
            'seller_id': auction.seller_id,
            'current_price': auction.current_price,
            'current_winner': auction.current_winner or '',
            'bid_count': 0,
            'created_at': auction.created_at
        })

        # Add to auctions index
        self.redis.zadd('auctions:by_end_time', {auction.id: auction.end_time})
        self.redis.sadd(f"auctions:seller:{auction.seller_id}", auction.id)

        return auction.id

    def get_auction(self, auction_id: str) -> Optional[Dict]:
        """Get auction details"""
        data = self.redis.hgetall(f"auction:{auction_id}")
        if not data:
            return None

        return {
            'id': data['id'],
            'title': data['title'],
            'description': data['description'],
            'starting_price': float(data['starting_price']),
            'reserve_price': float(data['reserve_price']) if data['reserve_price'] else None,
            'min_increment': float(data['min_increment']),
            'start_time': float(data['start_time']),
            'end_time': float(data['end_time']),
            'status': data['status'],
            'seller_id': data['seller_id'],
            'current_price': float(data['current_price']),
            'current_winner': data['current_winner'] if data['current_winner'] else None,
            'bid_count': int(data['bid_count']),
            'created_at': float(data['created_at'])
        }

    def start_auction(self, auction_id: str) -> bool:
        """Start an auction"""
        auction = self.get_auction(auction_id)
        if not auction:
            return False

        if auction['status'] not in [AuctionStatus.DRAFT.value, AuctionStatus.SCHEDULED.value]:
            return False

        self.redis.hset(f"auction:{auction_id}", 'status', AuctionStatus.ACTIVE.value)

        # Publish auction start event
        self.redis.publish(f"auction:{auction_id}:events", json.dumps({
            'type': 'auction_started',
            'auction_id': auction_id,
            'timestamp': time.time()
        }))

        return True

    def end_auction(self, auction_id: str) -> Dict:
        """End an auction and determine winner"""
        auction = self.get_auction(auction_id)
        if not auction or auction['status'] != AuctionStatus.ACTIVE.value:
            return {'success': False, 'error': 'Auction not active'}

        # Check reserve price
        reserve_met = True
        if auction['reserve_price'] and auction['current_price'] < auction['reserve_price']:
            reserve_met = False

        # Update status
        self.redis.hset(f"auction:{auction_id}", 'status', AuctionStatus.ENDED.value)

        result = {
            'success': True,
            'auction_id': auction_id,
            'final_price': auction['current_price'],
            'winner': auction['current_winner'] if reserve_met else None,
            'reserve_met': reserve_met,
            'bid_count': auction['bid_count']
        }

        # Publish auction end event
        self.redis.publish(f"auction:{auction_id}:events", json.dumps({
            'type': 'auction_ended',
            **result,
            'timestamp': time.time()
        }))

        return result

    def get_active_auctions(self, limit: int = 50) -> List[Dict]:
        """Get active auctions"""
        now = time.time()

        # Get auctions ending soonest
        auction_ids = self.redis.zrangebyscore(
            'auctions:by_end_time',
            now,
            '+inf',
            start=0,
            num=limit
        )

        auctions = []
        for aid in auction_ids:
            auction = self.get_auction(aid)
            if auction and auction['status'] == AuctionStatus.ACTIVE.value:
                auctions.append(auction)

        return auctions
```

## Atomic Bid Processing

The key to a reliable bidding system is atomic bid processing that prevents race conditions.

```python
class BidService:
    """Process bids atomically with Redis Lua scripts"""

    PLACE_BID_SCRIPT = """
    local auction_key = KEYS[1]
    local bids_key = KEYS[2]
    local bidder_bids_key = KEYS[3]

    local bid_id = ARGV[1]
    local bidder_id = ARGV[2]
    local bid_amount = tonumber(ARGV[3])
    local timestamp = tonumber(ARGV[4])
    local is_auto_bid = ARGV[5] == 'true'
    local max_auto_bid = tonumber(ARGV[6]) or 0

    -- Get auction data
    local status = redis.call('HGET', auction_key, 'status')
    if status ~= 'active' then
        return cjson.encode({success = false, error = 'AUCTION_NOT_ACTIVE'})
    end

    local end_time = tonumber(redis.call('HGET', auction_key, 'end_time'))
    if timestamp > end_time then
        return cjson.encode({success = false, error = 'AUCTION_ENDED'})
    end

    local current_price = tonumber(redis.call('HGET', auction_key, 'current_price'))
    local min_increment = tonumber(redis.call('HGET', auction_key, 'min_increment'))
    local current_winner = redis.call('HGET', auction_key, 'current_winner')
    local seller_id = redis.call('HGET', auction_key, 'seller_id')

    -- Validation
    if bidder_id == seller_id then
        return cjson.encode({success = false, error = 'SELLER_CANNOT_BID'})
    end

    if bidder_id == current_winner then
        return cjson.encode({success = false, error = 'ALREADY_WINNING'})
    end

    local min_bid = current_price + min_increment
    if bid_amount < min_bid then
        return cjson.encode({
            success = false,
            error = 'BID_TOO_LOW',
            min_bid = min_bid,
            current_price = current_price
        })
    end

    -- Check for auto-bid competition
    local auto_bid_key = auction_key .. ':auto_bid'
    local existing_auto_bid = redis.call('HGETALL', auto_bid_key)

    local final_price = bid_amount
    local winner = bidder_id

    if #existing_auto_bid > 0 then
        local auto_bidder = existing_auto_bid[2]
        local auto_max = tonumber(existing_auto_bid[4])

        if auto_bidder ~= bidder_id and auto_max >= bid_amount then
            -- Auto-bidder outbids
            if is_auto_bid and max_auto_bid > auto_max then
                -- New auto-bid is higher
                final_price = auto_max + min_increment
                winner = bidder_id
                redis.call('HMSET', auto_bid_key, 'bidder_id', bidder_id, 'max_bid', max_auto_bid)
            else
                -- Existing auto-bidder wins
                final_price = math.min(bid_amount + min_increment, auto_max)
                winner = auto_bidder

                -- Record the losing bid
                local losing_bid = cjson.encode({
                    id = bid_id,
                    auction_id = KEYS[1]:gsub('auction:', ''),
                    bidder_id = bidder_id,
                    amount = bid_amount,
                    timestamp = timestamp,
                    outbid = true
                })
                redis.call('ZADD', bids_key, timestamp, losing_bid)
            end
        end
    end

    -- Set up new auto-bid if provided
    if is_auto_bid and max_auto_bid > final_price then
        redis.call('HMSET', auto_bid_key, 'bidder_id', bidder_id, 'max_bid', max_auto_bid)
    end

    -- Update auction
    redis.call('HSET', auction_key, 'current_price', final_price)
    redis.call('HSET', auction_key, 'current_winner', winner)
    redis.call('HINCRBY', auction_key, 'bid_count', 1)

    -- Store bid
    local bid_data = cjson.encode({
        id = bid_id,
        auction_id = KEYS[1]:gsub('auction:', ''),
        bidder_id = winner,
        amount = final_price,
        timestamp = timestamp,
        is_winning = true
    })
    redis.call('ZADD', bids_key, timestamp, bid_data)

    -- Track bidder's bids
    redis.call('SADD', bidder_bids_key, KEYS[1]:gsub('auction:', ''))

    return cjson.encode({
        success = true,
        bid_id = bid_id,
        amount = final_price,
        winner = winner,
        is_outbid = winner ~= bidder_id
    })
    """

    def __init__(self, redis_client):
        self.redis = redis_client
        self._place_bid = redis_client.register_script(self.PLACE_BID_SCRIPT)

    def place_bid(
        self,
        auction_id: str,
        bidder_id: str,
        amount: float,
        max_auto_bid: Optional[float] = None
    ) -> Dict:
        """Place a bid atomically"""
        bid_id = str(uuid.uuid4())
        timestamp = time.time()
        is_auto_bid = max_auto_bid is not None and max_auto_bid > amount

        result = self._place_bid(
            keys=[
                f"auction:{auction_id}",
                f"auction:{auction_id}:bids",
                f"bidder:{bidder_id}:auctions"
            ],
            args=[
                bid_id,
                bidder_id,
                str(amount),
                str(timestamp),
                'true' if is_auto_bid else 'false',
                str(max_auto_bid or 0)
            ]
        )

        bid_result = json.loads(result)

        if bid_result.get('success'):
            # Publish bid event for real-time updates
            self.redis.publish(f"auction:{auction_id}:events", json.dumps({
                'type': 'new_bid',
                'auction_id': auction_id,
                'bid_id': bid_result['bid_id'],
                'amount': bid_result['amount'],
                'bidder_id': bid_result['winner'],
                'timestamp': timestamp,
                'bid_count': self.get_bid_count(auction_id)
            }))

        return bid_result

    def get_bid_history(self, auction_id: str, limit: int = 50) -> List[Dict]:
        """Get bid history for an auction"""
        bids_raw = self.redis.zrevrange(
            f"auction:{auction_id}:bids",
            0, limit - 1,
            withscores=True
        )

        bids = []
        for bid_json, score in bids_raw:
            bid = json.loads(bid_json)
            bids.append(bid)

        return bids

    def get_bid_count(self, auction_id: str) -> int:
        """Get total bid count"""
        count = self.redis.hget(f"auction:{auction_id}", 'bid_count')
        return int(count) if count else 0

    def get_bidder_auctions(self, bidder_id: str) -> List[str]:
        """Get auctions a user has bid on"""
        return list(self.redis.smembers(f"bidder:{bidder_id}:auctions"))


# Usage example
r = redis.Redis(decode_responses=True)
bid_service = BidService(r)

# Place a bid
result = bid_service.place_bid(
    auction_id='auction_123',
    bidder_id='user_456',
    amount=150.00,
    max_auto_bid=200.00  # Optional auto-bid maximum
)
print(f"Bid result: {result}")
```

## Real-Time Updates with WebSocket

```python
import asyncio
import aioredis
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from typing import Dict, Set

app = FastAPI()

class AuctionWebSocketManager:
    """Manage WebSocket connections for auction updates"""

    def __init__(self):
        self.connections: Dict[str, Set[WebSocket]] = {}  # auction_id -> connections
        self.redis = None
        self.subscription_tasks: Dict[str, asyncio.Task] = {}

    async def get_redis(self):
        if not self.redis:
            self.redis = await aioredis.from_url('redis://localhost', decode_responses=True)
        return self.redis

    async def connect(self, websocket: WebSocket, auction_id: str, user_id: str = None):
        """Connect to auction updates"""
        await websocket.accept()

        if auction_id not in self.connections:
            self.connections[auction_id] = set()
            # Start Redis subscription for this auction
            self.subscription_tasks[auction_id] = asyncio.create_task(
                self._subscribe_auction(auction_id)
            )

        self.connections[auction_id].add(websocket)

        # Send current auction state
        await self._send_current_state(websocket, auction_id)

        # Publish viewer count update
        await self._update_viewer_count(auction_id)

    async def disconnect(self, websocket: WebSocket, auction_id: str):
        """Disconnect from auction"""
        if auction_id in self.connections:
            self.connections[auction_id].discard(websocket)

            if not self.connections[auction_id]:
                del self.connections[auction_id]
                if auction_id in self.subscription_tasks:
                    self.subscription_tasks[auction_id].cancel()
                    del self.subscription_tasks[auction_id]

        await self._update_viewer_count(auction_id)

    async def _subscribe_auction(self, auction_id: str):
        """Subscribe to auction events"""
        redis = await self.get_redis()
        pubsub = redis.pubsub()
        await pubsub.subscribe(f"auction:{auction_id}:events")

        try:
            async for message in pubsub.listen():
                if message['type'] == 'message':
                    await self._broadcast(auction_id, message['data'])
        except asyncio.CancelledError:
            pass
        finally:
            await pubsub.unsubscribe(f"auction:{auction_id}:events")

    async def _broadcast(self, auction_id: str, message: str):
        """Broadcast message to all connected clients"""
        if auction_id not in self.connections:
            return

        dead_connections = set()
        for ws in self.connections[auction_id]:
            try:
                await ws.send_text(message)
            except Exception:
                dead_connections.add(ws)

        for ws in dead_connections:
            self.connections[auction_id].discard(ws)

    async def _send_current_state(self, websocket: WebSocket, auction_id: str):
        """Send current auction state to new connection"""
        redis = await self.get_redis()

        # Get auction data
        auction_data = await redis.hgetall(f"auction:{auction_id}")
        if not auction_data:
            await websocket.send_text(json.dumps({
                'type': 'error',
                'message': 'Auction not found'
            }))
            return

        # Get recent bids
        bids_raw = await redis.zrevrange(f"auction:{auction_id}:bids", 0, 9)
        bids = [json.loads(b) for b in bids_raw]

        # Get viewer count
        viewer_count = len(self.connections.get(auction_id, set()))

        await websocket.send_text(json.dumps({
            'type': 'initial_state',
            'auction': {
                'id': auction_data['id'],
                'title': auction_data['title'],
                'current_price': float(auction_data['current_price']),
                'current_winner': auction_data.get('current_winner') or None,
                'bid_count': int(auction_data.get('bid_count', 0)),
                'end_time': float(auction_data['end_time']),
                'status': auction_data['status']
            },
            'recent_bids': bids,
            'viewer_count': viewer_count
        }))

    async def _update_viewer_count(self, auction_id: str):
        """Broadcast viewer count update"""
        count = len(self.connections.get(auction_id, set()))
        await self._broadcast(auction_id, json.dumps({
            'type': 'viewer_count',
            'count': count
        }))


manager = AuctionWebSocketManager()

@app.websocket("/ws/auction/{auction_id}")
async def auction_websocket(websocket: WebSocket, auction_id: str):
    await manager.connect(websocket, auction_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message.get('type') == 'ping':
                await websocket.send_text(json.dumps({'type': 'pong'}))

    except WebSocketDisconnect:
        await manager.disconnect(websocket, auction_id)


@app.post("/api/auctions/{auction_id}/bid")
async def place_bid(auction_id: str, bidder_id: str, amount: float, max_auto_bid: float = None):
    """REST endpoint for placing bids"""
    redis = await manager.get_redis()
    bid_service = BidService(redis)

    result = bid_service.place_bid(auction_id, bidder_id, amount, max_auto_bid)

    if not result.get('success'):
        raise HTTPException(status_code=400, detail=result.get('error'))

    return result
```

## Frontend Bidding Interface

```javascript
class AuctionClient {
    constructor(auctionId, containerId) {
        this.auctionId = auctionId;
        this.container = document.getElementById(containerId);
        this.ws = null;
        this.auction = null;
        this.reconnectAttempts = 0;

        this.init();
    }

    init() {
        this.render();
        this.connect();
        this.startCountdown();
    }

    connect() {
        this.ws = new WebSocket(`wss://api.example.com/ws/auction/${this.auctionId}`);

        this.ws.onopen = () => {
            console.log('Connected to auction');
            this.reconnectAttempts = 0;
            this.updateStatus('connected');
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
        };

        this.ws.onclose = () => {
            this.updateStatus('disconnected');
            this.scheduleReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        // Send ping every 30 seconds
        this.pingInterval = setInterval(() => {
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);
    }

    handleMessage(message) {
        switch (message.type) {
            case 'initial_state':
                this.auction = message.auction;
                this.updateAuctionDisplay();
                this.updateBidHistory(message.recent_bids);
                this.updateViewerCount(message.viewer_count);
                break;

            case 'new_bid':
                this.handleNewBid(message);
                break;

            case 'viewer_count':
                this.updateViewerCount(message.count);
                break;

            case 'auction_ended':
                this.handleAuctionEnd(message);
                break;
        }
    }

    handleNewBid(bid) {
        // Update current price
        this.auction.current_price = bid.amount;
        this.auction.current_winner = bid.bidder_id;
        this.auction.bid_count = bid.bid_count;

        this.updateAuctionDisplay();

        // Add to bid history
        this.addBidToHistory(bid);

        // Show notification
        this.showBidNotification(bid);

        // Highlight price change
        this.animatePriceChange();
    }

    render() {
        this.container.innerHTML = `
            <div class="auction-container">
                <div class="auction-header">
                    <h1 class="auction-title">Loading...</h1>
                    <div class="auction-status">
                        <span class="status-indicator"></span>
                        <span class="status-text">Connecting...</span>
                    </div>
                </div>

                <div class="auction-main">
                    <div class="price-section">
                        <div class="current-price">
                            <label>Current Bid</label>
                            <span class="price-value">$0.00</span>
                        </div>
                        <div class="bid-count">
                            <span class="count-value">0</span> bids
                        </div>
                        <div class="time-remaining">
                            <label>Time Remaining</label>
                            <span class="countdown">--:--:--</span>
                        </div>
                    </div>

                    <div class="bid-section">
                        <div class="bid-input-group">
                            <label>Your Bid</label>
                            <input type="number" class="bid-input" step="0.01" min="0">
                            <span class="min-bid-hint">Minimum: $<span class="min-bid">0.00</span></span>
                        </div>

                        <div class="auto-bid-group">
                            <label>
                                <input type="checkbox" class="auto-bid-toggle">
                                Enable Auto-Bid
                            </label>
                            <input type="number" class="max-bid-input" placeholder="Maximum bid" disabled>
                        </div>

                        <button class="bid-button" onclick="auction.placeBid()">
                            Place Bid
                        </button>
                    </div>
                </div>

                <div class="bid-history">
                    <h3>Bid History</h3>
                    <div class="bid-list"></div>
                </div>

                <div class="auction-footer">
                    <span class="viewer-count">
                        <span class="viewer-icon">👁</span>
                        <span class="viewer-value">0</span> watching
                    </span>
                </div>
            </div>
        `;

        // Setup event listeners
        this.container.querySelector('.auto-bid-toggle').addEventListener('change', (e) => {
            this.container.querySelector('.max-bid-input').disabled = !e.target.checked;
        });
    }

    updateAuctionDisplay() {
        if (!this.auction) return;

        this.container.querySelector('.auction-title').textContent = this.auction.title;
        this.container.querySelector('.price-value').textContent = this.formatCurrency(this.auction.current_price);
        this.container.querySelector('.count-value').textContent = this.auction.bid_count;

        const minBid = this.auction.current_price + (this.auction.min_increment || 1);
        this.container.querySelector('.min-bid').textContent = minBid.toFixed(2);
        this.container.querySelector('.bid-input').min = minBid;
        this.container.querySelector('.bid-input').placeholder = minBid.toFixed(2);
    }

    updateBidHistory(bids) {
        const list = this.container.querySelector('.bid-list');
        list.innerHTML = bids.map(bid => this.renderBid(bid)).join('');
    }

    addBidToHistory(bid) {
        const list = this.container.querySelector('.bid-list');
        const bidEl = document.createElement('div');
        bidEl.innerHTML = this.renderBid(bid);
        bidEl.firstElementChild.classList.add('new-bid');
        list.insertBefore(bidEl.firstElementChild, list.firstChild);

        // Remove old bids if too many
        while (list.children.length > 10) {
            list.lastChild.remove();
        }
    }

    renderBid(bid) {
        const time = new Date(bid.timestamp * 1000).toLocaleTimeString();
        return `
            <div class="bid-item">
                <span class="bid-amount">${this.formatCurrency(bid.amount)}</span>
                <span class="bid-bidder">${this.maskBidderId(bid.bidder_id)}</span>
                <span class="bid-time">${time}</span>
            </div>
        `;
    }

    async placeBid() {
        const bidInput = this.container.querySelector('.bid-input');
        const amount = parseFloat(bidInput.value);

        if (isNaN(amount) || amount <= 0) {
            this.showError('Please enter a valid bid amount');
            return;
        }

        const autoBidEnabled = this.container.querySelector('.auto-bid-toggle').checked;
        const maxBid = autoBidEnabled
            ? parseFloat(this.container.querySelector('.max-bid-input').value)
            : null;

        try {
            const response = await fetch(`/api/auctions/${this.auctionId}/bid`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bidder_id: this.getCurrentUserId(),
                    amount: amount,
                    max_auto_bid: maxBid
                })
            });

            const result = await response.json();

            if (!response.ok) {
                this.showError(result.detail || 'Bid failed');
                return;
            }

            // Clear input
            bidInput.value = '';
            this.showSuccess('Bid placed successfully!');

        } catch (error) {
            this.showError('Failed to place bid. Please try again.');
        }
    }

    startCountdown() {
        this.countdownInterval = setInterval(() => {
            if (!this.auction) return;

            const now = Date.now() / 1000;
            const remaining = this.auction.end_time - now;

            if (remaining <= 0) {
                this.container.querySelector('.countdown').textContent = 'ENDED';
                clearInterval(this.countdownInterval);
                return;
            }

            const hours = Math.floor(remaining / 3600);
            const minutes = Math.floor((remaining % 3600) / 60);
            const seconds = Math.floor(remaining % 60);

            this.container.querySelector('.countdown').textContent =
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            // Urgency styling
            if (remaining < 60) {
                this.container.querySelector('.countdown').classList.add('urgent');
            } else if (remaining < 300) {
                this.container.querySelector('.countdown').classList.add('warning');
            }
        }, 1000);
    }

    handleAuctionEnd(result) {
        this.auction.status = 'ended';

        const modal = document.createElement('div');
        modal.className = 'auction-end-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Auction Ended!</h2>
                ${result.winner
                    ? `<p>Winning bid: ${this.formatCurrency(result.final_price)}</p>
                       <p>Winner: ${this.maskBidderId(result.winner)}</p>`
                    : '<p>Reserve price not met. No winner.</p>'
                }
                <button onclick="this.parentElement.parentElement.remove()">Close</button>
            </div>
        `;
        this.container.appendChild(modal);
    }

    updateViewerCount(count) {
        this.container.querySelector('.viewer-value').textContent = count;
    }

    updateStatus(status) {
        const indicator = this.container.querySelector('.status-indicator');
        const text = this.container.querySelector('.status-text');

        indicator.className = `status-indicator ${status}`;
        text.textContent = status === 'connected' ? 'Live' : 'Reconnecting...';
    }

    animatePriceChange() {
        const priceEl = this.container.querySelector('.price-value');
        priceEl.classList.add('price-updated');
        setTimeout(() => priceEl.classList.remove('price-updated'), 500);
    }

    showBidNotification(bid) {
        // Show toast notification
        const toast = document.createElement('div');
        toast.className = 'bid-toast';
        toast.textContent = `New bid: ${this.formatCurrency(bid.amount)}`;
        this.container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    showError(message) {
        alert(message); // Replace with better UI
    }

    showSuccess(message) {
        console.log(message); // Replace with better UI
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    maskBidderId(id) {
        return `***${id.slice(-4)}`;
    }

    getCurrentUserId() {
        // Get from auth system
        return 'current_user_id';
    }

    scheduleReconnect() {
        const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts));
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), delay);
    }

    destroy() {
        if (this.ws) this.ws.close();
        if (this.pingInterval) clearInterval(this.pingInterval);
        if (this.countdownInterval) clearInterval(this.countdownInterval);
    }
}

// Usage
const auction = new AuctionClient('auction_123', 'auction-container');
```

## Conclusion

Building a real-time bidding system with Redis requires careful attention to atomicity, concurrency, and user experience. Key takeaways:

- Use Lua scripts for atomic bid processing to prevent race conditions
- Implement auto-bidding with atomic comparison logic
- Stream bid updates via WebSocket for instant feedback
- Handle auction timing and end conditions reliably
- Provide clear UI feedback for bid status and countdown
- Track viewer count for social proof

By combining Redis's atomic operations with real-time streaming, you can build auction platforms that handle high concurrency while providing a responsive user experience.
