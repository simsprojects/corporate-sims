import { Router } from 'express';

/**
 * Leaderboard API routes.
 */
export function createLeaderboardRouter(db) {

    const router = Router();

    // GET /api/leaderboard
    router.get('/', (req, res) => {
        const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
        const entries = db.getLeaderboard(limit);

        res.json({
            leaderboard: entries.map((e, i) => ({
                rank: i + 1,
                username: e.username,
                totalSlackPoints: e.total_slack_pts,
                totalWeeks: e.total_weeks,
                bestWeekScore: e.best_week_score,
                totalCoffee: e.total_coffee,
                totalMeetingsDodged: e.total_meetings_dodged,
                highestRank: e.highest_rank
            }))
        });
    });

    return router;
}
