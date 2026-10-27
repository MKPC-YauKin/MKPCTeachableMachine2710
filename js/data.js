/**
 * Quiz content. Every round is short enough to finish in one sitting,
 * and every question has exactly two options (A / B).
 */
export const QUIZ_SETS = [
  {
    id: "world-tour",
    title: "World Tour",
    eyebrow: "GEOGRAPHY",
    blurb: "Borders, capitals, and a few places worth a detour.",
    note: "Window seat recommended.",
    tone: "coral",
    icon: "globe",
    questions: [
      {
        prompt: "Which city is the capital of Australia?",
        options: ["Canberra", "Sydney"],
        correct: 0,
        explanation:
          "Canberra was purpose-built as a compromise capital between Sydney and Melbourne. It has held the title since 1913.",
      },
      {
        prompt: "Which country spans the most time zones?",
        options: ["Russia", "France"],
        correct: 1,
        explanation:
          "Counting its overseas territories, France stretches across 12 time zones. Russia, the largest country by land, has 11.",
      },
      {
        prompt: "Mount Kilimanjaro rises in which country?",
        options: ["Kenya", "Tanzania"],
        correct: 1,
        explanation:
          "Africa's highest peak sits in northern Tanzania, close to the Kenyan border. Its summit is 5,895 metres above sea level.",
      },
      {
        prompt: "The ancient rock-cut city of Petra is in…",
        options: ["Jordan", "Lebanon"],
        correct: 0,
        explanation:
          "Petra lies in southern Jordan and was carved into rose-coloured sandstone by the Nabataean civilisation.",
      },
      {
        prompt: "Which is the world's largest island?",
        options: ["Australia", "Greenland"],
        correct: 1,
        explanation:
          "Greenland is the largest island. Australia is usually classified as a continent rather than an island, which keeps it out of the running.",
      },
    ],
  },
  {
    id: "screen-time",
    title: "Screen Time",
    eyebrow: "FILM & TV",
    blurb: "Classic scenes, animated kitchens, and one very famous shark.",
    note: "Popcorn optional.",
    tone: "lilac",
    icon: "clapper",
    questions: [
      {
        prompt: "In the 1939 film The Wizard of Oz, Dorothy's slippers are…",
        options: ["Silver", "Ruby"],
        correct: 1,
        explanation:
          "They were silver in L. Frank Baum's book, but the Technicolor film made them ruby red — and cinema history was made.",
      },
      {
        prompt: "“Here's looking at you, kid” comes from which film?",
        options: ["Casablanca", "Gone with the Wind"],
        correct: 0,
        explanation:
          "Humphrey Bogart says it to Ingrid Bergman in Casablanca (1942). The line was reportedly ad-libbed during filming.",
      },
      {
        prompt: "In Ratatouille, what is the rat chef called?",
        options: ["Remy", "Emile"],
        correct: 0,
        explanation:
          "Remy is the aspiring chef. Emile is his brother, who is much more interested in eating than cooking.",
      },
      {
        prompt: "Who directed Jaws (1975)?",
        options: ["George Lucas", "Steven Spielberg"],
        correct: 1,
        explanation:
          "Steven Spielberg directed Jaws, the film widely credited with inventing the summer blockbuster.",
      },
      {
        prompt: "Spirited Away was produced by which studio?",
        options: ["Studio Ghibli", "Pixar"],
        correct: 0,
        explanation:
          "Hayao Miyazaki's Studio Ghibli made Spirited Away, which won the Academy Award for Best Animated Feature in 2003.",
      },
    ],
  },
  {
    id: "brain-sparks",
    title: "Brain Sparks",
    eyebrow: "SCIENCE",
    blurb: "A quick lap through planets, body parts, and things that fly.",
    note: "Lab coat not required.",
    tone: "lime",
    icon: "spark",
    questions: [
      {
        prompt: "What is the hardest naturally occurring substance?",
        options: ["Titanium", "Diamond"],
        correct: 1,
        explanation:
          "Diamond scores a perfect 10 on the Mohs hardness scale. Titanium is strong and light, but it is a metal, not the hardest mineral.",
      },
      {
        prompt: "Which planet has the most confirmed moons?",
        options: ["Saturn", "Jupiter"],
        correct: 0,
        explanation:
          "Saturn currently leads with more than 270 confirmed moons, overtaking Jupiter's count in 2023.",
      },
      {
        prompt: "Which organ produces insulin?",
        options: ["The liver", "The pancreas"],
        correct: 1,
        explanation:
          "The pancreas produces insulin, the hormone that helps cells take up glucose from the bloodstream.",
      },
      {
        prompt: "Which gas makes up most of Earth's atmosphere?",
        options: ["Nitrogen", "Oxygen"],
        correct: 0,
        explanation:
          "Nitrogen accounts for about 78% of the air around us. Oxygen is a distant second at roughly 21%.",
      },
      {
        prompt: "Which mammal is capable of true, sustained flight?",
        options: ["The flying squirrel", "The bat"],
        correct: 1,
        explanation:
          "Bats are the only mammals with true powered flight. Flying squirrels glide, but they cannot flap their way upward.",
      },
    ],
  },
  {
    id: "sound-check",
    title: "Sound Check",
    eyebrow: "MUSIC",
    blurb: "Albums, instruments, and the roots of a whole culture.",
    note: "Volume up.",
    tone: "mint",
    icon: "wave",
    questions: [
      {
        prompt: "Which instrument has 88 keys?",
        options: ["A pipe organ", "A piano"],
        correct: 1,
        explanation:
          "A standard piano has 88 keys: 52 white and 36 black. Pipe organs can have far more keys, or far fewer.",
      },
      {
        prompt: "Which Beatles album cover shows a zebra crossing?",
        options: ["Abbey Road", "Let It Be"],
        correct: 0,
        explanation:
          "The Abbey Road cover shows the four Beatles walking across the street outside EMI Studios in London.",
      },
      {
        prompt: "In music, what does “forte” mean?",
        options: ["Loud", "Fast"],
        correct: 0,
        explanation:
          "Forte means loud or strong. Fast is indicated by “allegro” or “presto”.",
      },
      {
        prompt: "Who is known as the “Queen of Soul”?",
        options: ["Diana Ross", "Aretha Franklin"],
        correct: 1,
        explanation:
          "Aretha Franklin earned the title with hits such as Respect, Think, and Chain of Fools.",
      },
      {
        prompt: "In which city did hip-hop begin?",
        options: ["New York City", "Los Angeles"],
        correct: 0,
        explanation:
          "Hip-hop emerged in the Bronx, New York City, in the 1970s, growing out of block parties and DJ culture.",
      },
    ],
  },
];

export const SCORING = {
  base: 100,
  streakBonus: 20,
  streakBonusCap: 4,
};

export function scoreAnswer(isCorrect, streakBefore) {
  if (!isCorrect) {
    return { points: 0, base: 0, bonus: 0, streakAfter: 0 };
  }

  const bonus =
    Math.min(Math.max(streakBefore, 0), SCORING.streakBonusCap) *
    SCORING.streakBonus;

  return {
    points: SCORING.base + bonus,
    base: SCORING.base,
    bonus,
    streakAfter: streakBefore + 1,
  };
}

export function getMaxScore(questionCount) {
  return Array.from({ length: questionCount }).reduce(
    (total, _, index) => total + scoreAnswer(true, index).points,
    0,
  );
}

export function getSetById(setId) {
  return QUIZ_SETS.find((quizSet) => quizSet.id === setId) || null;
}
