import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBooking } from '@/contexts/BookingContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ParkingSpace, VehicleType, PaymentMethod } from '@/types';
import { Calendar, Clock, Car, CreditCard, Check } from 'lucide-react';
import { toast } from 'sonner';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  parking: ParkingSpace;
}

export const BookingModal: React.FC<BookingModalProps> = ({ isOpen, onClose, parking }) => {
  const { user, vehicles } = useAuth();
  const { createBooking } = useBooking();

  const [step, setStep] = useState<'vehicle-type' | 'slot-selection' | 'details' | 'payment' | 'success'>('vehicle-type');
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [customVehicleNumber, setCustomVehicleNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState('2');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [bookingId, setBookingId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setStep('vehicle-type');
      setSelectedVehicleType(null);
      setSelectedSlot(null);
    }
  }, [isOpen]);

  const availableSlots = selectedVehicleType
    ? parking.slots.filter(s => s.vehicleType === selectedVehicleType && s.status === 'available')
    : [];

  const handleVehicleTypeSelect = (type: VehicleType) => {
    setSelectedVehicleType(type);
    setStep('slot-selection');
  };

  const handleSlotSelect = (slotId: string) => {
    setSelectedSlot(slotId);
    setStep('details');
  };

  const handleDetailsSubmit = () => {
    if (!selectedVehicle && !customVehicleNumber) {
      toast.error('Please select or enter a vehicle number');
      return;
    }
    setStep('payment');
  };

  const calculateTotal = () => {
    const slot = parking.slots.find(s => s.id === selectedSlot);
    if (!slot) return 0;
    const hours = parseInt(duration);
    return slot.pricePerHour * hours;
  };

  const handlePayment = async () => {
    if (!user || !selectedSlot || !selectedVehicleType) return;

    const vehicleNumber = customVehicleNumber || vehicles.find(v => v.id === selectedVehicle)?.number || '';
    const startDateTime = new Date(`${date}T${time}`);
    const endDateTime = new Date(startDateTime.getTime() + parseInt(duration) * 60 * 60 * 1000);

    const bookingData = {
      userId: user.id,
      parkingId: parking.id,
      slotId: selectedSlot,
      vehicleId: selectedVehicle || 'custom',
      vehicleNumber,
      vehicleType: selectedVehicleType,
      startTime: startDateTime,
      endTime: endDateTime,
      duration: parseInt(duration),
      totalPrice: calculateTotal(),
      paymentMethod,
      status: 'upcoming' as const,
    };

    const id = await createBooking(bookingData);
    setBookingId(id);
    setStep('success');
  };

  const handleClose = () => {
    setStep('vehicle-type');
    setSelectedVehicleType(null);
    setSelectedSlot(null);
    setSelectedVehicle('');
    setCustomVehicleNumber('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book Parking Slot</DialogTitle>
          <DialogDescription>{parking.name}</DialogDescription>
        </DialogHeader>

        {step === 'vehicle-type' && (
          <div className="space-y-4">
            <h3 className="font-semibold">Select Vehicle Type</h3>
            <div className="grid grid-cols-2 gap-4">
              {parking.vehicleTypes.includes('car') && (
                <Card
                  className="cursor-pointer hover:border-primary transition-smooth"
                  onClick={() => handleVehicleTypeSelect('car')}
                >
                  <CardHeader className="text-center">
                    <div className="text-4xl mb-2">🚗</div>
                    <CardTitle>Car</CardTitle>
                    <CardDescription>
                      {parking.slots.filter(s => s.vehicleType === 'car' && s.status === 'available').length} slots available
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
              {parking.vehicleTypes.includes('bike') && (
                <Card
                  className="cursor-pointer hover:border-primary transition-smooth"
                  onClick={() => handleVehicleTypeSelect('bike')}
                >
                  <CardHeader className="text-center">
                    <div className="text-4xl mb-2">🏍️</div>
                    <CardTitle>Bike</CardTitle>
                    <CardDescription>
                      {parking.slots.filter(s => s.vehicleType === 'bike' && s.status === 'available').length} slots available
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </div>
          </div>
        )}

        {step === 'slot-selection' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                Select {selectedVehicleType === 'car' ? '🚗 Car' : '🏍️ Bike'} Slot
              </h3>
              <Button variant="outline" size="sm" onClick={() => setStep('vehicle-type')}>
                Change Type
              </Button>
            </div>

            {availableSlots.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No {selectedVehicleType} slots available
                </p>
                <Button className="mt-4" onClick={() => setStep('vehicle-type')}>
                  Select Different Type
                </Button>
              </div>
            ) : (
              <>
                {parking.parkingLayout === 'parallel' ? (
                  <div className="space-y-2">
                    {availableSlots.map((slot) => (
                      <Card
                        key={slot.id}
                        className={`cursor-pointer hover:border-primary transition-smooth ${
                          selectedSlot === slot.id ? 'border-primary bg-primary/5' : ''
                        }`}
                        onClick={() => handleSlotSelect(slot.id)}
                      >
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl font-bold">{slot.slotNumber}</div>
                            <div className="h-12 w-24 border-2 border-dashed rounded flex items-center justify-center text-xs">
                              {selectedVehicleType === 'car' ? '🚗' : '🏍️'}
                            </div>
                          </div>
                          <div className="text-sm font-medium">${slot.pricePerHour}/hr</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : parking.parkingLayout === 'scattered' ? (
                  <div className="relative h-96 border-2 rounded-lg p-4 bg-muted/20">
                    <div className="absolute inset-0 p-4">
                      {availableSlots.map((slot, index) => {
                        const positions = [
                          { top: '10%', left: '15%' },
                          { top: '25%', left: '60%' },
                          { top: '45%', left: '30%' },
                          { top: '60%', left: '70%' },
                          { top: '75%', left: '20%' },
                          { top: '15%', left: '80%' },
                          { top: '50%', left: '50%' },
                          { top: '80%', left: '55%' },
                        ];
                        const pos = positions[index % positions.length];
                        return (
                          <Card
                            key={slot.id}
                            className={`absolute cursor-pointer hover:border-primary transition-smooth w-16 ${
                              selectedSlot === slot.id ? 'border-primary bg-primary/5' : ''
                            }`}
                            style={{ top: pos.top, left: pos.left }}
                            onClick={() => handleSlotSelect(slot.id)}
                          >
                            <CardContent className="p-2 text-center">
                              <div className="text-lg font-bold">{slot.slotNumber}</div>
                              <div className="text-xs">${slot.pricePerHour}/hr</div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    {availableSlots.map((slot) => (
                      <Card
                        key={slot.id}
                        className={`cursor-pointer hover:border-primary transition-smooth ${
                          selectedSlot === slot.id ? 'border-primary bg-primary/5' : ''
                        }`}
                        onClick={() => handleSlotSelect(slot.id)}
                      >
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold mb-1">{slot.slotNumber}</div>
                          <div className="text-xs text-muted-foreground">
                            ${slot.pricePerHour}/hr
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Booking Details</h3>
              <Button variant="outline" size="sm" onClick={() => setStep('slot-selection')}>
                Change Slot
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Vehicle</Label>
                {vehicles.length > 0 ? (
                  <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles
                        .filter(v => v.type === selectedVehicleType)
                        .map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.number} ({vehicle.model || vehicle.type})
                          </SelectItem>
                        ))}
                      <SelectItem value="custom">Enter custom number</SelectItem>
                    </SelectContent>
                  </Select>
                ) : null}
                {(vehicles.length === 0 || selectedVehicle === 'custom') && (
                  <Input
                    placeholder="Enter vehicle number"
                    value={customVehicleNumber}
                    onChange={(e) => setCustomVehicleNumber(e.target.value)}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Start Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (hours)</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger id="duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 24].map((h) => (
                      <SelectItem key={h} value={h.toString()}>
                        {h} {h === 1 ? 'hour' : 'hours'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full" onClick={handleDetailsSubmit}>
                Continue to Payment
              </Button>
            </div>
          </div>
        )}

        {step === 'payment' && (
          <div className="space-y-4">
            <h3 className="font-semibold">Payment & Summary</h3>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parking:</span>
                  <span className="font-medium">{parking.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Slot:</span>
                  <span className="font-medium">
                    #{parking.slots.find(s => s.id === selectedSlot)?.slotNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vehicle:</span>
                  <span className="font-medium">
                    {customVehicleNumber || vehicles.find(v => v.id === selectedVehicle)?.number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date & Time:</span>
                  <span className="font-medium">{date} at {time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{duration} hours</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold text-primary text-lg">${calculateTotal()}</span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['upi', 'qr', 'netbanking', 'card', 'cash'] as PaymentMethod[]).map((method) => (
                  <Button
                    key={method}
                    type="button"
                    variant={paymentMethod === method ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod(method)}
                    className="capitalize"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {method === 'upi' ? 'UPI' : method === 'qr' ? 'QR Code' : method}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('details')}>
                Back
              </Button>
              <Button className="flex-1" onClick={handlePayment}>
                Complete Booking
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-6 text-center py-8">
            <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-success" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">Booking Confirmed!</h3>
              <p className="text-muted-foreground">
                Your parking slot has been booked successfully
              </p>
            </div>
            <Card>
              <CardContent className="pt-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking ID:</span>
                  <span className="font-medium">{bookingId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parking:</span>
                  <span className="font-medium">{parking.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid:</span>
                  <span className="font-bold text-success">${calculateTotal()}</span>
                </div>
              </CardContent>
            </Card>
            <Button className="w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
