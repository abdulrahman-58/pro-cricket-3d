using UnityEngine;
using UnityEngine.UI;
using ProCricket3D.Core;
using ProCricket3D.Batting;
using ProCricket3D.Bowling;

namespace ProCricket3D.UI
{
    /// <summary>
    /// International TV broadcast presentation controller providing dynamic score bugs,
    /// speed radars, batsman wagon wheel visualizers, and DRS reviews.
    /// </summary>
    public class BroadcastHUDController : MonoBehaviour
    {
        [Header("Score Bug UI Elements")]
        [SerializeField] private Text teamNameText;
        [SerializeField] private Text scoreOversText; // e.g. "142/3 (14.2)"
        [SerializeField] private Text targetRunRateText; // e.g. "CRR 9.68 | RRR 8.20"

        [Header("Striker & Bowler Panels")]
        [SerializeField] private Text strikerText; // e.g. "B. Babar* 64 (42)"
        [SerializeField] private Text nonStrikerText; // e.g. "M. Rizwan 38 (28)"
        [SerializeField] private Text bowlerFiguresText; // e.g. "S. Afridi 2.2-0-18-2"

        [Header("Ball Speed Radar")]
        [SerializeField] private GameObject speedRadarBanner;
        [SerializeField] private Text speedKmhText; // e.g. "148.4 KM/H"
        [SerializeField] private Text speedMphText; // e.g. "92.2 MPH"

        [Header("DRS Hawk-Eye & Snicko")]
        [SerializeField] private GameObject ultraEdgeOverlay;
        [SerializeField] private LineRenderer hawkEyeTrajectoryLine;

        [Header("Core References")]
        [SerializeField] private MatchScoreboardManager scoreboard;
        [SerializeField] private BowlingSystem bowling;
        [SerializeField] private BattingSystem batting;

        private void Start()
        {
            if (scoreboard != null)
            {
                scoreboard.OnScoreUpdated += RefreshScoreboardHUD;
                scoreboard.OnMatchFinished += HandleMatchFinished;
            }

            if (bowling != null)
            {
                bowling.OnBallDelivered += DisplaySpeedRadar;
            }

            if (batting != null)
            {
                batting.OnShotPlayed += HandleShotPlayed;
            }

            RefreshScoreboardHUD();
        }

        public void RefreshScoreboardHUD()
        {
            if (scoreboard == null) return;

            // 1. Team Score & Overs Bug
            int overs = scoreboard.TotalLegalBallsBowled / 6;
            int ballsInOver = scoreboard.LegalBallsBowledInOver;
            if (scoreOversText != null)
            {
                scoreOversText.text = $"{scoreboard.TotalRuns}/{scoreboard.WicketsLost} ({overs}.{ballsInOver})";
            }

            // 2. Run Rates
            if (targetRunRateText != null)
            {
                if (scoreboard.CurrentInnings == 2 && scoreboard.TargetScore > 0)
                {
                    int runsNeeded = scoreboard.TargetScore - scoreboard.TotalRuns;
                    targetRunRateText.text = $"Need {runsNeeded} runs | CRR: {scoreboard.CurrentRunRate:F2} | RRR: {scoreboard.RequiredRunRate:F2}";
                }
                else
                {
                    targetRunRateText.text = $"CRR: {scoreboard.CurrentRunRate:F2}";
                }
            }

            // 3. Batters & Bowler stats
            if (strikerText != null)
            {
                strikerText.text = $"{scoreboard.Striker.Name}* {scoreboard.Striker.Runs} ({scoreboard.Striker.BallsFaced})";
            }
            if (nonStrikerText != null)
            {
                nonStrikerText.text = $"{scoreboard.NonStriker.Name} {scoreboard.NonStriker.Runs} ({scoreboard.NonStriker.BallsFaced})";
            }
            if (bowlerFiguresText != null)
            {
                bowlerFiguresText.text = $"{scoreboard.ActiveBowler.Name} {scoreboard.ActiveBowler.OversString}-{scoreboard.ActiveBowler.Maidens}-{scoreboard.ActiveBowler.RunsConceded}-{scoreboard.ActiveBowler.Wickets}";
            }
        }

        private void DisplaySpeedRadar(DeliveryType delivery, AccuracyGrade grade, float speedKmh)
        {
            if (speedRadarBanner == null) return;

            speedRadarBanner.SetActive(true);
            float speedMph = speedKmh * 0.621371f;

            if (speedKmhText != null) speedKmhText.text = $"{speedKmh:F1} KM/H";
            if (speedMphText != null) speedMphText.text = $"{speedMph:F1} MPH";

            CancelInvoke(nameof(HideSpeedRadar));
            Invoke(nameof(HideSpeedRadar), 3.5f);
        }

        private void HideSpeedRadar()
        {
            if (speedRadarBanner != null) speedRadarBanner.SetActive(false);
        }

        private void HandleShotPlayed(ShotResult shot)
        {
            if (shot.IsEdge && ultraEdgeOverlay != null)
            {
                // Trigger Snicko spike
                ultraEdgeOverlay.SetActive(true);
                CancelInvoke(nameof(HideUltraEdge));
                Invoke(nameof(HideUltraEdge), 2.5f);
            }
        }

        private void HideUltraEdge()
        {
            if (ultraEdgeOverlay != null) ultraEdgeOverlay.SetActive(false);
        }

        private void HandleMatchFinished(string resultMessage)
        {
            Debug.Log($"[BROADCAST HUD] Match Concluded: {resultMessage}");
        }

        private void OnDestroy()
        {
            if (scoreboard != null)
            {
                scoreboard.OnScoreUpdated -= RefreshScoreboardHUD;
                scoreboard.OnMatchFinished -= HandleMatchFinished;
            }
        }
    }
}
