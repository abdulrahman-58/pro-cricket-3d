export class MatchEngine {
  constructor(teamBatting, teamBowling, totalOvers = 2) {
    this.initMatch(teamBatting, teamBowling, totalOvers);
    this.listeners = [];
  }

  initMatch(teamBatting, teamBowling, totalOvers = 2) {
    this.teamBatting = teamBatting;
    this.teamBowling = teamBowling;
    this.totalOvers = totalOvers;
    this.totalBallsLimit = this.totalOvers * 6;

    this.currentInnings = 1;
    this.totalRuns = 0;
    this.wickets = 0;
    this.legalBalls = 0;
    this.target = null;

    // Pick top 2 batsmen from batting squad
    this.striker = {
      name: teamBatting.squad[0].name,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0
    };
    this.nonStriker = {
      name: teamBatting.squad[1].name,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0
    };

    // Pick lead strike bowler from bowling squad
    this.currentBowler = {
      name: teamBowling.squad[7].name,
      overs: "0.0",
      runs: 0,
      wickets: 0
    };

    this.recentOvers = [];
    this.lastDeliveryOutcome = null;
    this.nextBatsmanIdx = 2;
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach((fn) => fn(this.getState()));
  }

  getState() {
    const oversCompleted = Math.floor(this.legalBalls / 6);
    const ballsInOver = this.legalBalls % 6;
    const oversStr = `${oversCompleted}.${ballsInOver}`;
    const crr = this.legalBalls > 0 ? ((this.totalRuns * 6) / this.legalBalls).toFixed(2) : "0.00";
    let rrr = "0.00";

    if (this.currentInnings === 2 && this.target) {
      const runsRemaining = this.target - this.totalRuns;
      const ballsRemaining = this.totalBallsLimit - this.legalBalls;
      rrr = ballsRemaining > 0 ? ((runsRemaining * 6) / ballsRemaining).toFixed(2) : "0.00";
    }

    return {
      teamBatting: this.teamBatting,
      teamBowling: this.teamBowling,
      innings: this.currentInnings,
      runs: this.totalRuns,
      wickets: this.wickets,
      oversStr,
      legalBalls: this.legalBalls,
      totalBallsLimit: this.totalBallsLimit,
      target: this.target,
      crr,
      rrr,
      striker: this.striker,
      nonStriker: this.nonStriker,
      bowler: this.currentBowler,
      recentOvers: this.recentOvers,
      lastOutcome: this.lastDeliveryOutcome,
      isGameOver: this.isMatchConcluded()
    };
  }

  processShot(timingGrade, shotAngleDeg, isLofted, ballSpeedKmh) {
    const outcome = {
      runs: 0,
      isWicket: false,
      wicketType: "",
      timing: timingGrade,
      commentary: "",
      shotName: this.getShotName(shotAngleDeg, isLofted)
    };

    this.striker.balls++;

    if (timingGrade === "MISSED") {
      outcome.runs = 0;
      outcome.commentary = "Beaten all ends up! Swung right through the batsman.";
    } else if (timingGrade === "PERFECT") {
      if (isLofted) {
        outcome.runs = 6;
        this.striker.sixes++;
        outcome.commentary = `WHAT A SHOT! Clean connection, sailing 94 meters for a MAXIMUM SIX!`;
      } else {
        outcome.runs = 4;
        this.striker.fours++;
        outcome.commentary = `CRACKING SHOT! Pounded through the outfield rope for FOUR!`;
      }
    } else if (timingGrade === "GOOD") {
      if (isLofted) {
        if (Math.random() < 0.25) {
          outcome.isWicket = true;
          outcome.wicketType = "CAUGHT";
          outcome.commentary = `IN THE AIR... AND TAKEN! Long-on settles under it and takes a clean catch!`;
        } else {
          outcome.runs = 4;
          this.striker.fours++;
          outcome.commentary = `One bounce into the advertising cushions for FOUR!`;
        }
      } else {
        outcome.runs = Math.random() < 0.6 ? 2 : 1;
        outcome.commentary = `Nicely placed into the deep pocket, they sprint back for ${outcome.runs}.`;
      }
    } else if (timingGrade === "EARLY" || timingGrade === "LATE") {
      outcome.runs = Math.random() < 0.5 ? 1 : 0;
      outcome.commentary = `Mistimed off the sticker of the bat, rolled toward mid-off.`;
    } else if (timingGrade === "EDGED") {
      if (Math.random() < 0.5) {
        outcome.isWicket = true;
        outcome.wicketType = "CAUGHT BEHIND";
        outcome.commentary = `EDGED AND TAKEN! Feathered straight through to the wicketkeeper!`;
      } else {
        outcome.runs = 4;
        this.striker.fours++;
        outcome.commentary = `Thick outside edge flying past slip cordon down to the third-man boundary!`;
      }
    }

    this.applyDelivery(outcome);
    return outcome;
  }

  processBowled() {
    const outcome = {
      runs: 0,
      isWicket: true,
      wicketType: "BOWLED",
      timing: "BOWLED",
      commentary: "KNOCKED HIM OVER! Off-stump cartwheeling out of the ground!",
      shotName: "Bowled"
    };
    this.striker.balls++;
    this.applyDelivery(outcome);
    return outcome;
  }

  applyDelivery(outcome) {
    this.totalRuns += outcome.runs;
    this.striker.runs += outcome.runs;
    this.currentBowler.runs += outcome.runs;
    this.legalBalls++;

    if (outcome.isWicket) {
      this.wickets++;
      this.currentBowler.wickets++;
      this.recentOvers.push("W");

      // Next batsman from squad
      const nextName = this.teamBatting.squad[this.nextBatsmanIdx] ? this.teamBatting.squad[this.nextBatsmanIdx].name : "Tailender";
      this.nextBatsmanIdx++;
      this.striker = { name: nextName, runs: 0, balls: 0, fours: 0, sixes: 0 };
    } else {
      this.recentOvers.push(outcome.runs.toString());
      if (outcome.runs % 2 !== 0) {
        this.rotateStrike();
      }
    }

    // Over completion check
    if (this.legalBalls % 6 === 0) {
      this.rotateStrike();
      const ov = Math.floor(this.legalBalls / 6);
      this.currentBowler.overs = `${ov}.0`;
    }

    this.lastDeliveryOutcome = outcome;
    this.checkInningsTransition();
    this.notify();
  }

  rotateStrike() {
    const temp = this.striker;
    this.striker = this.nonStriker;
    this.nonStriker = temp;
  }

  checkInningsTransition() {
    if (this.currentInnings === 1) {
      if (this.wickets >= 10 || this.legalBalls >= this.totalBallsLimit) {
        this.target = this.totalRuns + 1;
        this.currentInnings = 2;

        // Switch Batting and Bowling Teams!
        const tempTeam = this.teamBatting;
        this.teamBatting = this.teamBowling;
        this.teamBowling = tempTeam;

        this.totalRuns = 0;
        this.wickets = 0;
        this.legalBalls = 0;
        this.recentOvers = [];
        this.nextBatsmanIdx = 2;

        this.striker = { name: this.teamBatting.squad[0].name, runs: 0, balls: 0, fours: 0, sixes: 0 };
        this.nonStriker = { name: this.teamBatting.squad[1].name, runs: 0, balls: 0, fours: 0, sixes: 0 };
        this.currentBowler = { name: this.teamBowling.squad[7].name, overs: "0.0", runs: 0, wickets: 0 };
      }
    }
  }

  isMatchConcluded() {
    if (this.currentInnings === 2) {
      if (this.target && this.totalRuns >= this.target) return true;
      if (this.wickets >= 10 || this.legalBalls >= this.totalBallsLimit) return true;
    }
    return false;
  }

  getShotName(angleDeg, isLofted) {
    const prefix = isLofted ? "Lofted " : "";
    if (angleDeg >= 330 || angleDeg < 30) return prefix + "Straight Drive";
    if (angleDeg >= 30 && angleDeg < 75) return prefix + "Cover Drive";
    if (angleDeg >= 75 && angleDeg < 120) return prefix + "Square Cut";
    if (angleDeg >= 120 && angleDeg < 165) return "Late Cut / Uppercut";
    if (angleDeg >= 165 && angleDeg < 210) return "Fine Leg Flick";
    if (angleDeg >= 210 && angleDeg < 255) return isLofted ? "Slog Sweep" : "Pull Shot";
    if (angleDeg >= 255 && angleDeg < 300) return prefix + "Mid-Wicket Punch";
    return prefix + "On-Drive";
  }
}
