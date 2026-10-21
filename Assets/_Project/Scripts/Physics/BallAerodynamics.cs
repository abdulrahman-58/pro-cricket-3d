using UnityEngine;

namespace ProCricket3D.Physics
{
    public enum PitchType
    {
        Standard,
        GreenSeam,    // Fast, lateral seam movement, higher bounce
        DustySpin,    // Low bounce, high friction, heavy spin grip
        HardFlat,     // Consistent true bounce, batsman paradise
        DampWet       // Variable bounce, skidding deliveries
    }

    /// <summary>
    /// Realistic aerodynamic ball physics engine simulating gravity, air drag,
    /// Magnus effect (swing), and surface restitution (pitch bounce and spin grip).
    /// </summary>
    public class BallAerodynamics : MonoBehaviour
    {
        [Header("Ball Physical Constants")]
        [SerializeField] private float ballMass = 0.160f; // 160 grams (Standard Cricket Ball)
        [SerializeField] private float ballRadius = 0.036f; // 3.6 cm radius
        [SerializeField] private float airDensity = 1.225f; // kg/m^3 at sea level
        [SerializeField] private float dragCoefficient = 0.45f; // Sphere aerodynamic drag

        [Header("Pitch & Environmental Settings")]
        [SerializeField] private PitchType currentPitchType = PitchType.Standard;
        [SerializeField] private float pitchFriction = 0.65f;
        [SerializeField] private float pitchRestitution = 0.55f; // Coefficient of restitution (bounce height)

        [Header("Live Physics State")]
        public Vector3 Velocity { get; private set; }
        public Vector3 SpinAngularVelocity { get; private set; } // Radians per sec (RPM)
        public bool IsInFlight { get; private set; }
        public bool HasPitched { get; private set; }
        public Vector3 PitchImpactPoint { get; private set; }

        private Rigidbody rb;
        private TrailRenderer trailRenderer;

        private void Awake()
        {
            rb = GetComponent<Rigidbody>();
            if (rb == null)
            {
                rb = gameObject.AddComponent<Rigidbody>();
            }

            rb.mass = ballMass;
            rb.useGravity = false; // Custom trajectory integration for accurate Magnus effect
            rb.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;

            trailRenderer = GetComponent<TrailRenderer>();
        }

        /// <summary>
        /// Launch the ball from bowler hand with release velocity, seam angle, and spin rate.
        /// </summary>
        /// <param name="initialVelocity">Release speed and direction vector (m/s)</param>
        /// <param name="spinRpm">Revolutions per minute imparted</param>
        /// <param name="seamAngleDegrees">Seam tilt relative to flight path (-15 to +15 for swing)</param>
        public void ReleaseDelivery(Vector3 initialVelocity, float spinRpm, float seamAngleDegrees)
        {
            Velocity = initialVelocity;
            HasPitched = false;
            IsInFlight = true;

            // Calculate angular spin vector
            float spinRadSec = (spinRpm * 2f * Mathf.PI) / 60f;
            Vector3 spinAxis = Quaternion.AngleAxis(seamAngleDegrees, Vector3.up) * Vector3.up;
            SpinAngularVelocity = spinAxis * spinRadSec;

            if (trailRenderer != null)
            {
                trailRenderer.Clear();
                trailRenderer.emitting = true;
            }
        }

        private void FixedUpdate()
        {
            if (!IsInFlight) return;

            SimulateStep(Time.fixedDeltaTime);
        }

        /// <summary>
        /// Numerically integrates ball motion using Runge-Kutta / Verlet aerodynamic principles.
        /// </summary>
        private void SimulateStep(float dt)
        {
            float speed = Velocity.magnitude;
            if (speed < 0.1f) return;

            Vector3 flightDir = Velocity.normalized;
            float crossSectionArea = Mathf.PI * ballRadius * ballRadius;

            // 1. Aerodynamic Drag Force: Fd = 0.5 * rho * v^2 * Cd * A
            Vector3 dragForce = -0.5f * airDensity * (speed * speed) * dragCoefficient * crossSectionArea * flightDir;

            // 2. Magnus Effect (Conventional / Reverse Swing): Fm = S * (Spin x Velocity)
            // Magnus lift coefficient proportional to spin ratio
            float spinRatio = (ballRadius * SpinAngularVelocity.magnitude) / speed;
            float magnusCoeff = 0.5f * airDensity * crossSectionArea * Mathf.Clamp01(spinRatio);
            Vector3 magnusForce = magnusCoeff * Vector3.Cross(SpinAngularVelocity, Velocity);

            // 3. Gravity Force: Fg = m * g
            Vector3 gravityForce = Vector3.down * 9.81f * ballMass;

            // Net Force and Acceleration
            Vector3 totalForce = dragForce + magnusForce + gravityForce;
            Vector3 acceleration = totalForce / ballMass;

            // Update Velocity & Position
            Velocity += acceleration * dt;
            transform.position += Velocity * dt;
        }

        /// <summary>
        /// Handles collision with pitch surface, calculating bounce restitution and seam/spin deviation.
        /// </summary>
        public void HandlePitchContact(Vector3 contactNormal, Vector3 contactPoint)
        {
            if (HasPitched) return;

            HasPitched = true;
            PitchImpactPoint = contactPoint;

            // Resolve vertical restitution (bounce)
            float normalVelocity = Vector3.Dot(Velocity, contactNormal);
            Vector3 normalComponent = contactNormal * normalVelocity;
            Vector3 tangentComponent = Velocity - normalComponent;

            // Pitch modifiers based on surface archetype
            float effectiveRestitution = pitchRestitution;
            float effectiveFriction = pitchFriction;

            switch (currentPitchType)
            {
                case PitchType.GreenSeam:
                    effectiveRestitution *= 1.15f;
                    // Lateral seam deviation (Nip backer or away movement)
                    float seamDeviation = Random.Range(-0.08f, 0.08f);
                    tangentComponent = Quaternion.AngleAxis(seamDeviation * 45f, Vector3.up) * tangentComponent;
                    break;

                case PitchType.DustySpin:
                    effectiveRestitution *= 0.85f;
                    effectiveFriction *= 1.35f;
                    // Spin turn: Convert angular momentum into lateral velocity
                    Vector3 spinTurnForce = Vector3.Cross(contactNormal, SpinAngularVelocity) * 0.04f;
                    tangentComponent += spinTurnForce;
                    break;

                case PitchType.HardFlat:
                    effectiveRestitution *= 1.10f;
                    break;
            }

            // Post-bounce velocity
            Velocity = (tangentComponent * (1f - effectiveFriction * 0.2f)) - (normalComponent * effectiveRestitution);

            // Dampen spin after impact
            SpinAngularVelocity *= 0.70f;
        }

        public void StopFlight()
        {
            IsInFlight = false;
            Velocity = Vector3.zero;
            if (trailRenderer != null)
            {
                trailRenderer.emitting = false;
            }
        }
    }
}
