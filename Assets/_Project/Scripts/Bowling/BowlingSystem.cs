using System;
using UnityEngine;
using ProCricket3D.Physics;

namespace ProCricket3D.Bowling
{
    public enum BowlingStyle
    {
        RightArmFast,
        LeftArmFast,
        RightArmOffSpin,
        RightArmLegSpin,
        LeftArmOrthodox
    }

    public enum DeliveryType
    {
        StockBall,
        Outswinger,
        Inswinger,
        Yorker,
        Bouncer,
        SlowerBall,
        Googly,
        Doosra,
        TopSpinner,
        ArmBall
    }

    public enum AccuracyGrade
    {
        Perfect,
        Good,
        Mistimed,
        NoBall,
        Wide
    }

    /// <summary>
    /// Delivery delivery engine controlling line, length, release speed, seam orientation,
    /// and the precision release accuracy meter.
    /// </summary>
    public class BowlingSystem : MonoBehaviour
    {
        [Header("Bowler Profile")]
        [SerializeField] private BowlingStyle style = BowlingStyle.RightArmFast;
        [Range(60, 160)] [SerializeField] private float topSpeedKmh = 145f;
        [Range(40, 99)] [SerializeField] private int controlRating = 85;

        [Header("References")]
        [SerializeField] private BallAerodynamics ball;
        [SerializeField] private Transform releasePoint;
        [SerializeField] private Transform pitchCenter;

        public event Action<DeliveryType, AccuracyGrade, float> OnBallDelivered;

        /// <summary>
        /// Release delivery toward the target pitch coordinates with selected variation and meter accuracy.
        /// </summary>
        /// <param name="targetPitchPoint">Point on the pitch where the delivery is aimed to bounce</param>
        /// <param name="delivery">Delivery variation (Inswinger, Yorker, Googly etc.)</param>
        /// <param name="meterAccuracyNormalized">0.0 (red) to 1.0 (dead center green)</param>
        public void ExecuteDelivery(Vector3 targetPitchPoint, DeliveryType delivery, float meterAccuracyNormalized)
        {
            if (ball == null || releasePoint == null) return;

            // 1. Calculate accuracy grade
            AccuracyGrade grade = EvaluateRelease(meterAccuracyNormalized);

            // 2. Add error deviation if delivery was mistimed
            Vector3 finalTarget = ApplyControlDeviation(targetPitchPoint, grade);

            // 3. Calculate target speed (m/s)
            float speedKmh = CalculateDeliverySpeed(delivery, grade);
            float speedMs = speedKmh / 3.6f;

            // 4. Calculate spin RPM and seam angle
            (float spinRpm, float seamAngle) = ResolveAerodynamics(delivery);

            // 5. Position ball at bowler release hand and launch
            ball.transform.position = releasePoint.position;

            Vector3 releaseToTarget = (finalTarget - releasePoint.position).normalized;
            // Arc trajectory calculation to reach the target bounce point
            Vector3 releaseVelocity = releaseToTarget * speedMs;
            releaseVelocity.y += 1.8f; // Slight downward release angle

            ball.ReleaseDelivery(releaseVelocity, spinRpm, seamAngle);

            OnBallDelivered?.Invoke(delivery, grade, speedKmh);
        }

        private AccuracyGrade EvaluateRelease(float meterVal)
        {
            if (meterVal >= 0.90f) return AccuracyGrade.Perfect;
            if (meterVal >= 0.65f) return AccuracyGrade.Good;
            if (meterVal >= 0.35f) return AccuracyGrade.Mistimed;
            return UnityEngine.Random.value > 0.5f ? AccuracyGrade.NoBall : AccuracyGrade.Wide;
        }

        private Vector3 ApplyControlDeviation(Vector3 target, AccuracyGrade grade)
        {
            float maxDeviation = grade switch
            {
                AccuracyGrade.Perfect => 0.05f,
                AccuracyGrade.Good => 0.20f,
                AccuracyGrade.Mistimed => 0.65f,
                AccuracyGrade.Wide => 1.40f,
                AccuracyGrade.NoBall => 0.80f,
                _ => 0.25f
            };

            float controlFactor = (100 - controlRating) / 100f;
            Vector2 randomCircle = UnityEngine.Random.insideUnitCircle * (maxDeviation * controlFactor);
            return new Vector3(target.x + randomCircle.x, target.y, target.z + randomCircle.y);
        }

        private float CalculateDeliverySpeed(DeliveryType delivery, AccuracyGrade grade)
        {
            float baseSpeed = topSpeedKmh;

            switch (delivery)
            {
                case DeliveryType.SlowerBall:
                    baseSpeed *= 0.80f;
                    break;
                case DeliveryType.Bouncer:
                    baseSpeed *= 1.02f;
                    break;
                case DeliveryType.Yorker:
                    baseSpeed *= 0.98f;
                    break;
                case DeliveryType.Googly:
                case DeliveryType.Doosra:
                    baseSpeed *= 0.95f;
                    break;
            }

            if (grade == AccuracyGrade.Perfect) baseSpeed += 2.5f;

            return baseSpeed;
        }

        private (float spinRpm, float seamAngle) ResolveAerodynamics(DeliveryType delivery)
        {
            return delivery switch
            {
                DeliveryType.Outswinger => (1400f, 12f),
                DeliveryType.Inswinger => (1400f, -12f),
                DeliveryType.Yorker => (1600f, 0f),
                DeliveryType.Bouncer => (2200f, 0f),
                DeliveryType.SlowerBall => (900f, 5f),
                DeliveryType.Googly => (2400f, -35f),
                DeliveryType.Doosra => (2200f, 35f),
                DeliveryType.TopSpinner => (2600f, 0f),
                _ => (1200f, 0f)
            };
        }
    }
}
