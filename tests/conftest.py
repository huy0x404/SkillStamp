"""Conftest setup for offline contract testing."""
import sys
import types

# Create a lightweight stub for GenVM's internal 'genlayer' SDK
genlayer_stub = types.ModuleType("genlayer")


class MockPublic:
    @staticmethod
    def write(fn):
        return fn

    @staticmethod
    def view(fn):
        return fn


class MockVM:
    class UserError(Exception):
        pass


class MockNondet:
    pass


class MockEqPrinciple:
    pass


class MockContract:
    pass


genlayer_stub.gl = types.SimpleNamespace(
    Contract=MockContract,
    public=MockPublic,
    vm=MockVM,
    nondet=MockNondet,
    eq_principle=MockEqPrinciple,
    message=types.SimpleNamespace(sender_address=types.SimpleNamespace(as_hex="0x123")),
)

class MockAddress(str):
    @property
    def as_hex(self):
        return str(self)


genlayer_stub.allow_storage = lambda cls: cls
genlayer_stub.u256 = int
genlayer_stub.Address = MockAddress
genlayer_stub.TreeMap = dict
genlayer_stub.DynArray = list

sys.modules["genlayer"] = genlayer_stub
