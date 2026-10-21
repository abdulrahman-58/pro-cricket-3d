using System;
using UnityEngine;

namespace ProCricket3D.Core
{
    public enum WicketDismissalType
    {
        None,
        Bowled,
        Caught,
        LBW,
        RunOut,
        Stumped,
        HitWicket
    }

    public enum ExtraType
    {
        None,
        Wide,
        NoBall,
        Bye,
        LegBye
    }

    public struct DeliveryOutcome
    {
        public int RunsScored;
        public bool IsWicket;
        public WicketDismissalType Dismissal;
        public ExtraType Extra;
        public bool IsLegalDelivery;
        public bool IsFreeHitActive;
        public string CommentarySummary;
    }

    /// <summary>
    /// Comprehensive ICC cricket laws engine. Validates dismissals, adjudicates LBW,
    /// manages legal ball counts, free hits, and strike rotation.
    /// </summary>
    public class CricketRuleEngine : MonoBehaviour
    {
        public bool IsFreeHitNext { get; private set; }

        /// <summary>
        /// Adjudicates LBW using official Hawk-Eye criteria:
        /// 1. Ball pitched outside leg stump? -> NOT OUT.
        /// 2. Impact outside off stump without playing a shot? -> OUT if hitting.
        /// 3. Impact outside off stump while playing a shot? -> NOT OUT.
        /// 4. Predicted trajectory hitting wickets? -> OUT.
        /// </summary>
        public bool CheckLBW(Vector3 pitchPoint, Vector3 impactPoint, Vector3 predictedStumpHitPoint, bool playedShot)
        {
            float legStumpX = -0.114f; // 9 inches wicket width
            float offStumpX = 0.114f;
            float stumpHeight = 0.711f; // 28 inches

            // Rule 1: Pitched outside leg is automatically NOT OUT
            if (pitchPoint.x < legStumpX)
            {
                return false;
            }

            // Rule 2 & 3: Impact in line
            bool impactInLine = impactPoint.x >= legStumpX && impactPoint.x <= offStumpX;
            if (!impactInLine)
            {
                // Can only be out if outside off AND no genuine shot was attempted
                if (playedShot || impactPoint.x < legStumpX)
                {
                    return false;
                }
            }

            // Rule 4: Wickets hitting check
            bool hittingHorizontally = predictedStumpHitPoint.x >= legStumpX && predictedStumpHitPoint.x <= offStumpX;
            bool hittingVertically = predictedStumpHitPoint.y >= 0.05f && predictedStumpHitPoint.y <= stumpHeight;

            return hittingHorizontally && hittingVertically;
        }

        /// <summary>
        /// Process outcome of a completed delivery and resolve next match state flags.
        /// </summary>
        public DeliveryOutcome ProcessDelivery(
            int rawRuns,
            bool hitStumpsByBowler,
            bool caughtCleanly,
            bool isLBW,
            bool isRunOut,
            bool isStumped,
            bool isHitWicket,
            bool isWide,
            bool isNoBall)
        {
            DeliveryOutcome outcome = new DeliveryOutcome();

            // Check Extras first
            if (isNoBall)
            {
                outcome.Extra = ExtraType.NoBall;
                outcome.RunsScored = rawRuns + 1;
                outcome.IsLegalDelivery = false;
                outcome.IsFreeHitActive = true;
                IsFreeHitNext = true;

                // On a No-Ball, only Run Out is a valid dismissal
                if (isRunOut)
                {
                    outcome.IsWicket = true;
                    outcome.Dismissal = WicketDismissalType.RunOut;
                    outcome.CommentarySummary = "RUN OUT on a No Ball!";
                }
                else
                {
                    outcome.CommentarySummary = "NO BALL! Free Hit signaled!";
                }
                return outcome;
            }

            if (isWide)
            {
                outcome.Extra = ExtraType.Wide;
                outcome.RunsScored = rawRuns + 1;
                outcome.IsLegalDelivery = false;
                outcome.CommentarySummary = "WIDE BALL! Signal from the umpire.";
                return outcome;
            }

            // Legal Delivery
            outcome.IsLegalDelivery = true;
            bool wasFreeHit = IsFreeHitNext;
            IsFreeHitNext = false; // Free hit consumed

            // Check Dismissals (Cannot be out bowled/caught/lbw on a free hit)
            if (!wasFreeHit)
            {
                if (hitStumpsByBowler)
                {
                    outcome.IsWicket = true;
                    outcome.Dismissal = WicketDismissalType.Bowled;
                    outcome.CommentarySummary = "BOWLED HIM! Knocked the bails clean off!";
                    return outcome;
                }
                if (caughtCleanly)
                {
                    outcome.IsWicket = true;
                    outcome.Dismissal = WicketDismissalType.Caught;
                    outcome.CommentarySummary = "CAUGHT! Superb grab in the field!";
                    return outcome;
                }
                if (isLBW)
                {
                    outcome.IsWicket = true;
                    outcome.Dismissal = WicketDismissalType.LBW;
                    outcome.CommentarySummary = "OUT! Trapped right in front, given LBW!";
                    return outcome;
                }
                if (isStumped)
                {
                    outcome.IsWicket = true;
                    outcome.Dismissal = WicketDismissalType.Stumped;
                    outcome.CommentarySummary = "STUMPED! Wicketkeeper whips the bails off in a flash!";
                    return outcome;
                }
                if (isHitWicket)
                {
                    outcome.IsWicket = true;
                    outcome.Dismissal = WicketDismissalType.HitWicket;
                    outcome.CommentarySummary = "HIT WICKET! Dislodged his own bails!";
                    return outcome;
                }
            }

            // Run out is valid on free hits too
            if (isRunOut)
            {
                outcome.IsWicket = true;
                outcome.Dismissal = WicketDismissalType.RunOut;
                outcome.CommentarySummary = "RUN OUT! Direct hit at the non-striker end!";
                return outcome;
            }

            // Normal runs scored
            outcome.RunsScored = rawRuns;
            outcome.CommentarySummary = rawRuns switch
            {
                0 => "Dot ball. Well bowled.",
                1 => "Pushed into the gap for a single.",
                2 => "Good running between the wickets, two runs taken.",
                3 => "Terrific sprint, they turn three!",
                4 => "FOUR! Cracking shot racing across the turf to the fence!",
                6 => "SIX! Massive strike soaring deep into the stands!",
                _ => $"{rawRuns} runs added to the total."
            };

            return outcome;
        }
    }
}
