import { isValidObjectId } from "mongoose";

import HttpError from "../helpers/HttpError.js";
import {
  addWaterDataService,
  deleteWaterDateService,
  updateWaterDataService,
  waterDataPerPeriod,
  waterPerDay,
  waterPerMonth,
} from "../services/waterServices.js";
import { catchAsyncErr } from "../helpers/catchAsyncError.js";

export const addWaterData = catchAsyncErr(async (req, res) => {
  const waterData = await addWaterDataService(req.body, req.user);

  if (waterData) {
    res.status(201).json(waterData);
  } else {
    res.status(404).json({
      message: "Not found",
    });
  }
});

export const updateWaterData = catchAsyncErr(async (req, res) => {
  const isVlidId = isValidObjectId(req.params.id);

  if (isVlidId) {
    const updated = await updateWaterDataService(
      req.params.id,
      req.body,
      req.user
    );
    if (updated) {
      res.status(200).json(updated);
    } else {
      res.status(404).json({
        message: "Not found",
      });
    }
  } else {
    res.status(404).json({
      message: "Not found",
    });
  }
});

export const deleteWaterData = catchAsyncErr(async (req, res) => {
  const isValide = isValidObjectId(req.params.id);

  if (!isValide) {
    throw HttpError(404, "Not found");
  }

  const deletedData = await deleteWaterDateService(req.params.id, req.user);

  if (!deletedData) {
    throw HttpError(404, "Not found");
  }

  res.status(200).json({
    deletedData,
    message: "Water info was delete",
  });
});

export const getWaterDataPerPeriod = catchAsyncErr(async (req, res) => {
  const { year, month, day } = req.query;
  const { totalValue } = req.body;

  const periodData = await waterDataPerPeriod(year, month, day, req.user);

  if (!periodData || periodData.length === 0) {
    throw HttpError(404, "Not found");
  }

  res.status(200).json({ periodData, totalValue });
});

export const getWaterPerDay = catchAsyncErr(async (req, res) => {
  const { year, month, day } = req.query;

  const periodData = await waterPerDay(year, month, day, req.user);

  res.status(200).json(periodData);
});

export const getWaterPerMonth = catchAsyncErr(async (req, res) => {
  const { year, month } = req.query;

  const periodData = await waterPerMonth(year, month, req.user);

  res.status(200).json(periodData);
});