using System;
using UnityEngine;
using ProCricket3D.Physics;

namespace ProCricket3D.Batting
{
    public enum ShotElevation
    {
        Defensive,
        Grounded,
        Lofted
    }

    public enum Footwork
    {
        Auto,
        FrontFoot,
        BackFoot
    }

    public enum TimingQuality
    {
        Missed,
        Early,
        Good,
        Perfect,
        Late,
        InsideEdge,
        OutsideEdge
    }

    public struct ShotResult
    {
        public TimingQuality Timing;
        public ShotElevation Elevation;
        public Vector3 ExitVelocity;
        public float PowerPercent;
        public bool IsEdge;
        public string ShotName;
    }

    /// <summary>
    /// Batting execution engine featuring 360-degree shot mapping, dynamic sweet-spot
    /// timing matrices, footwork alignment, and exit velocity physics.
    /// </summary>
    public class BattingSystem : MonoBehaviour
    {
        [Header("Batting Attributes")]
        [Range(40, 99)] public int batsmanSkill = 85;
        [Range(40, 99)] public int handEyeCoordination = 88;
        [Range(40, 99)] public int rawPower = 82;

        [Header("Timing Windows (Milliseconds)")]
        [SerializeField] private float perfectWindowMs = 35f;
        [SerializeField] private float goodWindowMs = 70f;
        [SerializeField] private float edgeWindowMs = 110f;

        [Header("References")]
        [SerializeField] private Transform batImpactZone;
        [SerializeField] private BallAerodynamics activeBall;

        public event Action<ShotResult> OnShotPlayed;

        /// <summary>
        /// Execute shot based on player swipe angle (0-360 deg), elevation, and footwork.
        /// </summary>
        /// <param name="aimAngleDegrees">0 = Straight Drive, 90 = Point/Cut, 180 = Behind Wickets, 270 = Mid-Wicket</param>
        /// <param name="elevation">Grounded vs Lofted vs Defensive</param>
        /// <param name="footwork">Front foot or back foot</param>
        public ShotResult PlayShot(float aimAngleDegrees, ShotElevation elevation, Footwork footwork)
        {
            if (activeBall == null || !activeBall.IsInFlight)
            {
                return new ShotResult { Timing = TimingQuality.Missed };
            }

            // 1. Calculate time delta between ball position and bat impact zone
            Vector3 ballPos = activeBall.transform.position;
            Vector3 impactPos = batImpactZone != null ? batImpactZone.position : transform.position;
            float distanceToImpact = Vector3.Distance(ballPos, impactPos);
            float ballSpeed = activeBall.Velocity.magnitude;

            float timeToImpactSeconds = ballSpeed > 1f ? distanceToImpact / ballSpeed : 0f;
            float timingErrorMs = timeToImpactSeconds * 1000f;

            // 2. Evaluate Timing Quality
            TimingQuality timing = EvaluateTiming(timingErrorMs);

            // 3. Footwork penalty: Punish playing front foot to a bouncer or back foot to a yorker
            float footworkBonus = CalculateFootworkBonus(activeBall.transform.position.y, footwork);

            // 4. Calculate Exit Velocity & Direction Vector
            Vector3 exitVelocity = CalculateExitVelocity(aimAngleDegrees, elevation, timing, footworkBonus, ballSpeed);

            bool isEdge = timing == TimingQuality.InsideEdge || timing == TimingQuality.OutsideEdge;
            string shotName = ResolveShotName(aimAngleDegrees, elevation, footwork);

            ShotResult result = new ShotResult
            {
                Timing = timing,
                Elevation = elevation,
                ExitVelocity = exitVelocity,
                PowerPercent = Mathf.Clamp01((exitVelocity.magnitude / 45f) * 100f),
                IsEdge = isEdge,
                ShotName = shotName
            };

            // Apply calculated shot impulse directly to the ball physics engine
            if (timing != TimingQuality.Missed)
            {
                activeBall.ReleaseDelivery(exitVelocity, 1200f, 0f);
            }

            OnShotPlayed?.Invoke(result);
            return result;
        }

        private TimingQuality EvaluateTiming(float timingDeltaMs)
        {
            // Batsman hand-eye coordination widens the perfect timing window
            float skillMultiplier = 1f + ((handEyeCoordination - 50) / 100f);
            float effectivePerfect = perfectWindowMs * skillMultiplier;
            float effectiveGood = goodWindowMs * skillMultiplier;

            if (timingDeltaMs <= effectivePerfect)
            {
                return TimingQuality.Perfect;
            }
            else if (timingDeltaMs <= effectiveGood)
            {
                return TimingQuality.Good;
            }
            else if (timingDeltaMs <= edgeWindowMs)
            {
                // 50% chance of edge depending on batsman skill
                return UnityEngine.Random.value > 0.5f ? TimingQuality.OutsideEdge : TimingQuality.InsideEdge;
            }
            else if (timingDeltaMs <= edgeWindowMs * 1.5f)
            {
                return timingDeltaMs < 0 ? TimingQuality.Early : TimingQuality.Late;
            }

            return TimingQuality.Missed;
        }

        private float CalculateFootworkBonus(float ballHeightAtImpact, Footwork footwork)
        {
            if (footwork == Footwork.Auto) return 1.0f;

            // High ball (bouncer > 1.2m) demands back foot
            if (ballHeightAtImpact > 1.2f)
            {
                return footwork == Footwork.BackFoot ? 1.25f : 0.65f;
            }
            // Low / full ball demands front foot drive
            else
            {
                return footwork == Footwork.FrontFoot ? 1.20f : 0.70f;
            }
        }

        private Vector3 CalculateExitVelocity(float angleDeg, ShotElevation elevation, TimingQuality timing, float footworkBonus, float incomingSpeed)
        {
            float basePower = (rawPower / 100f) * 38f; // Max exit speed around 38-42 m/s (135-150 km/h)
            float timingMultiplier = timing switch
            {
                TimingQuality.Perfect => 1.25f,
                TimingQuality.Good => 1.0f,
                TimingQuality.Early => 0.65f,
                TimingQuality.Late => 0.60f,
                TimingQuality.OutsideEdge => 0.45f,
                TimingQuality.InsideEdge => 0.35f,
                _ => 0f
            };

            float finalSpeed = (basePower + (incomingSpeed * 0.35f)) * timingMultiplier * footworkBonus;

            // Direction calculation from angle
            Quaternion rotation = Quaternion.Euler(0, angleDeg, 0);
            Vector3 horizontalDir = rotation * Vector3.forward;

            // Vertical launch angle
            float verticalAngle = elevation switch
            {
                ShotElevation.Defensive => 2f,
                ShotElevation.Grounded => 4f,
                ShotElevation.Lofted => timing == TimingQuality.Perfect ? 32f : 42f, // Optimal 32 deg launch angle for maximum distance
                _ => 5f
            };

            if (timing == TimingQuality.OutsideEdge)
            {
                // Deflect toward slip cordon
                horizontalDir = Quaternion.Euler(0, 110f, 0) * horizontalDir;
                verticalAngle = 18f;
            }

            Vector3 finalVelocity = Quaternion.Euler(-verticalAngle, 0, 0) * horizontalDir * finalSpeed;
            return finalVelocity;
        }

        private string ResolveShotName(float angleDeg, ShotElevation elevation, Footwork footwork)
        {
            if (elevation == ShotElevation.Defensive) return "Forward Defensive";

            return angleDeg switch
            {
                >= 330 or < 30 => elevation == ShotElevation.Lofted ? "Lofted Straight Drive" : "Straight Drive",
                >= 30 and < 75 => elevation == ShotElevation.Lofted ? "Inside-Out Loft" : "Cover Drive",
                >= 75 and < 120 => "Square Cut",
                >= 120 and < 165 => "Late Cut / Uppercut",
                >= 165 and < 210 => "Fine Leg Glance / Scoop",
                >= 210 and < 255 => footwork == Footwork.BackFoot ? "Pull Shot" : "Square Leg Sweep",
                >= 255 and < 300 => elevation == ShotElevation.Lofted ? "Slog Sweep" : "Mid-Wicket Flick",
                _ => "On-Drive"
            };
        }
    }
}
