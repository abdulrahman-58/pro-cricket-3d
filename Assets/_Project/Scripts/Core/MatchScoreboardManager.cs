using System;
using UnityEngine;

namespace ProCricket3D.Core
{
    [Serializable]
    public class BatterStats
    {
        public string Name;
        public int Runs;
        public int BallsFaced;
        public int Fours;
        public int Sixes;
        public bool IsStriker;
        public bool IsOut;

        public float StrikeRate => BallsFaced > 0 ? (Runs * 100f) / BallsFaced : 0f;
    }

    [Serializable]
    public class BowlerStats
    {
        public string Name;
        public int BallsBowled;
        public int Maidens;
        public int RunsConceded;
        public int Wickets;

        public string OversString => $"{BallsBowled / 6}.{BallsBowled % 6}";
        public float Economy => BallsBowled > 0 ? (RunsConceded * 6f) / BallsBowled : 0f;
    }

    /// <summary>
    /// Central scoreboard authority tracking live match states, strike rotation,
    /// target calculations, and individual player scorecards.
    /// </summary>
    public class MatchScoreboardManager : MonoBehaviour
    {
        [Header("Match Format")]
        [SerializeField] private int totalOversLimit = 20; // T20 standard

        [Header("Live Innings State")]
        public int CurrentInnings { get; private set; } = 1;
        public int TotalRuns { get; private set; }
        public int WicketsLost { get; private set; }
        public int LegalBallsBowledInOver { get; private set; }
        public int TotalLegalBallsBowled { get; private set; }
        public int TargetScore { get; private set; } = -1;

        [Header("Current Players at Crease")]
        public BatterStats Striker = new BatterStats { Name = "B. Babar", IsStriker = true };
        public BatterStats NonStriker = new BatterStats { Name = "M. Rizwan", IsStriker = false };
        public BowlerStats ActiveBowler = new BowlerStats { Name = "S. Afridi" };

        public event Action OnScoreUpdated;
        public event Action<int> OnOverCompleted;
        public event Action<int, int> OnInningsCompleted; // TotalRuns, Wickets
        public event Action<string> OnMatchFinished;

        public float CurrentRunRate => TotalLegalBallsBowled > 0 ? (TotalRuns * 6f) / TotalLegalBallsBowled : 0f;
        public float RequiredRunRate
        {
            get
            {
                if (CurrentInnings != 2 || TargetScore <= 0) return 0f;
                int runsNeeded = TargetScore - TotalRuns;
                int ballsRemaining = (totalOversLimit * 6) - TotalLegalBallsBowled;
                return ballsRemaining > 0 ? (runsNeeded * 6f) / ballsRemaining : 0f;
            }
        }

        public void RecordDeliveryOutcome(DeliveryOutcome outcome)
        {
            TotalRuns += outcome.RunsScored;

            // Update Batter stats
            if (outcome.Extra == ExtraType.None || outcome.Extra == ExtraType.NoBall)
            {
                Striker.BallsFaced++;
                Striker.Runs += outcome.RunsScored;
                if (outcome.RunsScored == 4) Striker.Fours++;
                if (outcome.RunsScored == 6) Striker.Sixes++;
            }

            // Update Bowler stats
            ActiveBowler.RunsConceded += outcome.RunsScored;

            if (outcome.IsLegalDelivery)
            {
                LegalBallsBowledInOver++;
                TotalLegalBallsBowled++;
                ActiveBowler.BallsBowled++;
            }

            if (outcome.IsWicket)
            {
                WicketsLost++;
                Striker.IsOut = true;
                if (outcome.Dismissal != WicketDismissalType.RunOut)
                {
                    ActiveBowler.Wickets++;
                }
            }

            // Rotate strike on odd runs
            if (outcome.RunsScored % 2 != 0)
            {
                RotateStrike();
            }

            // Check End of Over
            if (LegalBallsBowledInOver >= 6)
            {
                LegalBallsBowledInOver = 0;
                RotateStrike(); // Strike changes at end of over
                int completedOvers = TotalLegalBallsBowled / 6;
                OnOverCompleted?.Invoke(completedOvers);
            }

            OnScoreUpdated?.Invoke();
            CheckMatchProgression();
        }

        public void RotateStrike()
        {
            (Striker, NonStriker) = (NonStriker, Striker);
            Striker.IsStriker = true;
            NonStriker.IsStriker = false;
        }

        private void CheckMatchProgression()
        {
            // Check Innings 2 Win
            if (CurrentInnings == 2 && TargetScore > 0 && TotalRuns >= TargetScore)
            {
                OnMatchFinished?.Invoke("Chasing team wins by " + (10 - WicketsLost) + " wickets!");
                return;
            }

            // Check All Out (10 wickets) or Overs Limit Reached
            bool isAllOut = WicketsLost >= 10;
            bool isOversCompleted = TotalLegalBallsBowled >= totalOversLimit * 6;

            if (isAllOut || isOversCompleted)
            {
                if (CurrentInnings == 1)
                {
                    TargetScore = TotalRuns + 1;
                    CurrentInnings = 2;
                    TotalRuns = 0;
                    WicketsLost = 0;
                    LegalBallsBowledInOver = 0;
                    TotalLegalBallsBowled = 0;
                    OnInningsCompleted?.Invoke(TargetScore - 1, WicketsLost);
                }
                else
                {
                    if (TotalRuns == TargetScore - 1)
                    {
                        OnMatchFinished?.Invoke("Match Tied! Super Over pending!");
                    }
                    else
                    {
                        OnMatchFinished?.Invoke("Defending team wins by " + (TargetScore - 1 - TotalRuns) + " runs!");
                    }
                }
            }
        }
    }
}
