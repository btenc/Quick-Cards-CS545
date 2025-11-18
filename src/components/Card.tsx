import React from "react";
import { motion, useReducedMotion, type Transition } from "framer-motion";

type CardProps = {
  front: string;
  back: string;
  flipped: boolean;
  onFlip: () => void;
};

export function Card({ front, back, flipped, onFlip }: CardProps) {
  const prefersReducedMotion = useReducedMotion();

  const content = flipped ? back || "—" : front || "—";
  const sideLabel = flipped ? "Answer side" : "Question side";

  const motionInitial = prefersReducedMotion
    ? false
    : { opacity: 0, rotateY: 12 };

  const motionAnimate = prefersReducedMotion
    ? { opacity: 1 }
    : { opacity: 1, rotateY: 0 };

  const motionExit = prefersReducedMotion ? { opacity: 0 } : { opacity: 0 };

  const reducedTransition: Transition = { duration: 0 };
  const tweenTransition: Transition = { type: "tween", duration: 0.18 };

  const motionTransition: Transition = prefersReducedMotion
    ? reducedTransition
    : tweenTransition;

  return (
    <motion.button
      type="button"
      onClick={onFlip}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
      className="relative mx-auto w-full max-w-2xl aspect-[3/2] surface text-left overflow-hidden"
      aria-pressed={flipped}
      aria-label={`Flashcard (${sideLabel})`}
      aria-describedby="card-hint"
    >
      <motion.div
        key={flipped ? "back" : "front"}
        initial={motionInitial}
        animate={motionAnimate}
        exit={motionExit}
        transition={motionTransition}
        className="h-full w-full p-5 grid place-items-center text-center text-lg leading-relaxed"
      >
        <div className="whitespace-pre-wrap">{content}</div>
      </motion.div>

      <div
        id="card-hint"
        className="absolute bottom-2 right-3 text-xs text-[var(--muted)] select-none"
      >
        Click or press Space to flip
      </div>
    </motion.button>
  );
}
