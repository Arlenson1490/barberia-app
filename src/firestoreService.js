import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  query, 
  orderBy 
} from "firebase/firestore";
import { db } from "./firebase";

const COLLECTION_NAME = "citas";
const CONFIG_DOC_PATH = ["configuracion", "barberia"];

/**
 * Escuchador en tiempo real de la colección de citas.
 */
export const subscribeToCitas = (callback) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const citas = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data()
    }));
    callback(citas);
  }, (error) => {
    console.error("Error en tiempo real con Firestore:", error);
  });
};

/**
 * Inserta la cita en segundo plano (soporta Optimistic UI).
 */
export const addCitaAsync = async (citaData) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), citaData);
    return { ok: true, id: docRef.id };
  } catch (error) {
    console.error("Error agregando cita en Firestore:", error);
    return { ok: false, error };
  }
};

/**
 * Actualiza el estado de una cita ("confirmed", "done", "cancelled").
 */
export const updateCitaStatus = async (citaId, status) => {
  try {
    const citaRef = doc(db, COLLECTION_NAME, citaId);
    await updateDoc(citaRef, { status });
    return { ok: true };
  } catch (error) {
    console.error("Error actualizando cita:", error);
    return { ok: false, error };
  }
};

/**
 * Elimina una cita de la colección.
 */
export const deleteCita = async (citaId) => {
  try {
    const citaRef = doc(db, COLLECTION_NAME, citaId);
    await deleteDoc(citaRef);
    return { ok: true };
  } catch (error) {
    console.error("Error eliminando cita:", error);
    return { ok: false, error };
  }
};

/**
 * Escuchador en tiempo real para la configuración de la barbería (horarios, servicios, etc.).
 */
export const subscribeToConfig = (callback) => {
  const configRef = doc(db, ...CONFIG_DOC_PATH);
  return onSnapshot(configRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    }
  }, (error) => {
    console.error("Error en tiempo real obteniendo configuración:", error);
  });
};

/**
 * Guarda o actualiza los datos de configuración en Firestore.
 */
export const updateConfigAsync = async (newConfig) => {
  try {
    const configRef = doc(db, ...CONFIG_DOC_PATH);
    await setDoc(configRef, newConfig, { merge: true });
    return { ok: true };
  } catch (error) {
    console.error("Error actualizando la configuración:", error);
    return { ok: false, error };
  }
};